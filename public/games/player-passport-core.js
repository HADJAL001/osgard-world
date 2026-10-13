export const PLAYER_PASSPORT_SCHEMA_VERSION = 1;
export const PASSPORT_RETENTION_DAYS = 180;
export const PASSPORT_MAX_SESSIONS = 500;
export const PASSPORT_GAME_IDS = Object.freeze([
  'null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade',
  'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid'
]);
export const PASSPORT_GAME_TITLES = Object.freeze({
  'null-shift': 'NULL//SHIFT',
  time: 'Империя времени',
  swarm: 'SWARM',
  inherit: 'INHERIT',
  remix: 'REMIX',
  'civic-cascade': 'CIVIC CASCADE',
  patina: 'PATINA Atelier',
  'signal-run': 'SIGNAL RUN',
  'cascade-lab': 'CASCADE LAB',
  'afterimage-run': 'AFTERIMAGE//RUN',
  'aether-grid': 'AETHER GRID'
});
const GAME_SET = new Set(PASSPORT_GAME_IDS);
const INVITE_METHODS = new Set(['web-share', 'clipboard', 'prompt']);
const DAY_MS = 86400000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_SESSION_SECONDS = 12 * 60 * 60;

export function utcDayKey(timestamp = Date.now()) {
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function emptyPassport() {
  return {
    schemaVersion: PLAYER_PASSPORT_SCHEMA_VERSION,
    sessions: [],
    invites: [],
    updatedAt: new Date(0).toISOString()
  };
}

function timestampOf(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

function normalizeInvite(raw, now, cutoff) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const at = timestampOf(raw.at);
  if (!Number.isFinite(at) || at < cutoff || at > now + MAX_FUTURE_SKEW_MS) return null;
  if (!INVITE_METHODS.has(raw.method)) return null;
  return { at: new Date(at).toISOString(), day: utcDayKey(at), method: raw.method };
}

export function normalizePassport(raw, now = Date.now()) {
  const fresh = emptyPassport();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schemaVersion !== PLAYER_PASSPORT_SCHEMA_VERSION) return fresh;
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const cutoff = safeNow - PASSPORT_RETENTION_DAYS * DAY_MS;
  const sessions = [];
  const seen = new Set();
  if (Array.isArray(raw.sessions)) {
    for (const item of raw.sessions) {
      if (!item || typeof item !== 'object' || Array.isArray(item) || !GAME_SET.has(item.gameId)) continue;
      const at = timestampOf(item.at);
      if (!Number.isFinite(at) || at < cutoff || at > safeNow + MAX_FUTURE_SKEW_MS) continue;
      const sessionId = typeof item.sessionId === 'string' && /^[a-z0-9:_-]{1,160}$/i.test(item.sessionId)
        ? item.sessionId
        : 'local_' + item.gameId + '_' + Math.floor(at);
      if (seen.has(sessionId)) continue;
      seen.add(sessionId);
      const rawDuration = Number(item.durationSeconds);
      const durationSeconds = Number.isFinite(rawDuration) && rawDuration >= 0
        ? Math.min(Math.floor(rawDuration), MAX_SESSION_SECONDS)
        : 0;
      sessions.push({
        sessionId,
        gameId: item.gameId,
        at: new Date(at).toISOString(),
        day: utcDayKey(at),
        durationSeconds,
        reason: ['closed_by_user', 'returned_to_catalog', 'completed', 'escape_to_catalog'].includes(item.reason)
          ? item.reason
          : 'ended'
      });
    }
  }
  sessions.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  fresh.sessions = sessions.slice(-PASSPORT_MAX_SESSIONS);
  if (Array.isArray(raw.invites)) {
    fresh.invites = raw.invites
      .map(item => normalizeInvite(item, safeNow, cutoff))
      .filter(Boolean)
      .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
      .slice(-250);
  }
  fresh.updatedAt = typeof raw.updatedAt === 'string' && Number.isFinite(Date.parse(raw.updatedAt))
    ? new Date(Math.min(Date.parse(raw.updatedAt), safeNow)).toISOString()
    : new Date(safeNow).toISOString();
  return fresh;
}

export function recordSession(raw, event, now = Date.now()) {
  const progress = normalizePassport(raw, now);
  if (!event || typeof event !== 'object' || event.sessionStarted !== true || !GAME_SET.has(event.game)) {
    return { progress, added: false, reason: 'not-a-started-session' };
  }
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const suppliedId = typeof event.sessionId === 'string' && /^[a-z0-9:_-]{1,160}$/i.test(event.sessionId)
    ? event.sessionId
    : '';
  if (suppliedId && progress.sessions.some(item => item.sessionId === suppliedId)) {
    return { progress, added: false, reason: 'duplicate-session' };
  }
  const last = progress.sessions[progress.sessions.length - 1];
  if (!suppliedId && last && last.gameId === event.game && safeNow >= Date.parse(last.at) && safeNow - Date.parse(last.at) < 2500) {
    return { progress, added: false, reason: 'duplicate-without-session-id' };
  }
  const sessionId = suppliedId || 'local_' + event.game + '_' + safeNow + '_' + progress.sessions.length;
  const duration = Number(event.durationSeconds);
  const item = {
    sessionId,
    gameId: event.game,
    at: new Date(safeNow).toISOString(),
    day: utcDayKey(safeNow),
    durationSeconds: Number.isFinite(duration) && duration >= 0 ? Math.min(Math.floor(duration), MAX_SESSION_SECONDS) : 0,
    reason: ['closed_by_user', 'returned_to_catalog', 'completed', 'escape_to_catalog'].includes(event.reason)
      ? event.reason
      : 'ended'
  };
  progress.sessions.push(item);
  progress.sessions = progress.sessions.slice(-PASSPORT_MAX_SESSIONS);
  progress.updatedAt = new Date(safeNow).toISOString();
  return { progress, added: true, reason: 'recorded' };
}

export function recordInvite(raw, method, now = Date.now()) {
  const progress = normalizePassport(raw, now);
  const safeNow = Number.isFinite(now) ? now : Date.now();
  if (!INVITE_METHODS.has(method)) return { progress, added: false, reason: 'invalid-method' };
  // One passport mission/XP credit per UTC day. It records preparing an invitation,
  // not a verified public post and not a redeemable in-game purchase.
  const day = utcDayKey(safeNow);
  if (progress.invites.some(item => item.day === day)) {
    return { progress, added: false, reason: 'already-prepared-today' };
  }
  progress.invites.push({ at: new Date(safeNow).toISOString(), day, method });
  progress.invites = progress.invites.slice(-250);
  progress.updatedAt = new Date(safeNow).toISOString();
  return { progress, added: true, reason: 'prepared' };
}

export function normalizeFavorites(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.filter(value => typeof value === 'string' && GAME_SET.has(value)))];
}

export function readLocalShardBalance(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
  const balance = raw.balance;
  return Number.isSafeInteger(balance) && balance >= 0 ? Math.min(balance, 1000000000) : 0;
}

export function streakLength(sessions, now = Date.now()) {
  const dates = new Set((Array.isArray(sessions) ? sessions : [])
    .filter(item => item && typeof item.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.day))
    .map(item => item.day));
  const today = utcDayKey(now);
  if (!today) return 0;
  const todayHasSession = dates.has(today);
  let cursor = todayHasSession ? new Date(today + 'T00:00:00.000Z') : new Date(Date.parse(today + 'T00:00:00.000Z') - DAY_MS);
  if (!dates.has(cursor.toISOString().slice(0, 10))) return 0;
  let count = 0;
  while (dates.has(cursor.toISOString().slice(0, 10)) && count < PASSPORT_RETENTION_DAYS) {
    count += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  return count;
}

export function derivePassport(raw, favoritesRaw, walletRaw, now = Date.now()) {
  const progress = normalizePassport(raw, now);
  const favorites = normalizeFavorites(favoritesRaw);
  const wallet = readLocalShardBalance(walletRaw);
  const today = utcDayKey(now);
  const todaysSessions = progress.sessions.filter(item => item.day === today);
  const uniqueAll = new Set(progress.sessions.map(item => item.gameId));
  const uniqueToday = new Set(todaysSessions.map(item => item.gameId));
  const days = new Set(progress.sessions.map(item => item.day));
  const todaysInvites = progress.invites.filter(item => item.day === today).length;
  const daysStreak = streakLength(progress.sessions, now);
  const xp = Math.min(999999, progress.sessions.length * 10 + uniqueAll.size * 15 + favorites.length * 3 + Math.min(progress.invites.length, 250) * 5);
  const badges = [
    { id: 'first-session', title: 'Первый след', description: 'Завершена первая игровая сессия', unlocked: progress.sessions.length >= 1 },
    { id: 'world-explorer', title: 'Исследователь миров', description: 'Опробованы три разных игры', unlocked: uniqueAll.size >= 3 },
    { id: 'curator', title: 'Куратор полки', description: 'В избранное добавлены три игры', unlocked: favorites.length >= 3 },
    { id: 'connector', title: 'Связующее звено', description: 'Подготовлено приглашение другу', unlocked: progress.invites.length >= 1 },
    { id: 'streak-three', title: 'Пульс вселенной', description: 'Игровые сессии в три дня подряд', unlocked: daysStreak >= 3 }
  ];
  const missions = [
    { id: 'play-today', title: 'Вернись из игры', detail: 'Заверши и закрой одну игровую сессию сегодня', progress: Math.min(1, todaysSessions.length), goal: 1, complete: todaysSessions.length >= 1 },
    { id: 'visit-two', title: 'Смени мир', detail: 'Проведи сессии в двух разных играх сегодня', progress: Math.min(2, uniqueToday.size), goal: 2, complete: uniqueToday.size >= 2 },
    { id: 'favorite-one', title: 'Выбери фаворита', detail: 'Сохрани хотя бы одну игру в избранное', progress: Math.min(1, favorites.length), goal: 1, complete: favorites.length >= 1 },
    { id: 'invite-one', title: 'Передай вызов', detail: 'Подготовь ссылку-приглашение. Публичный пост не проверяется.', progress: Math.min(1, todaysInvites), goal: 1, complete: todaysInvites >= 1 }
  ];
  return {
    progress,
    totalSessions: progress.sessions.length,
    uniqueGames: uniqueAll.size,
    activeDays: days.size,
    todaySessions: todaysSessions.length,
    todayUniqueGames: uniqueToday.size,
    favoritesCount: favorites.length,
    inviteCount: progress.invites.length,
    streakDays: daysStreak,
    xp,
    level: Math.floor(xp / 100) + 1,
    levelProgressPct: xp % 100,
    shardBalance: wallet,
    badges,
    missions
  };
}
