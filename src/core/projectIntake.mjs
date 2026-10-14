const GAME_IDS = new Set([
  'time', 'swarm', 'null-shift', 'inherit', 'remix', 'civic-cascade',
  'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid',
]);
const ATTRIBUTION_SLUG = /^[a-z0-9][a-z0-9_-]{0,47}$/;

function safeSlug(value, fallback) {
  const candidate = String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().toLowerCase();
  return ATTRIBUTION_SLUG.test(candidate) ? candidate : fallback;
}

/** Keep campaign attribution small, enumerable and free of arbitrary URLs or user text. */
export function normalizeLeadAttribution(search = '') {
  const params = new URLSearchParams(String(search).replace(/^\?/, ''));
  const gameCandidate = String(params.get('game_id') || params.get('game') || '').trim().toLowerCase();
  return {
    gameId: GAME_IDS.has(gameCandidate) ? gameCandidate : 'unknown',
    source: safeSlug(params.get('utm_source') || 'development_page', 'direct'),
    campaign: safeSlug(params.get('utm_campaign') || 'project_intake', ''),
  };
}

/** Read the public API URL only from deployment config; never guess a live endpoint. */
export function resolvePublicApiBase(raw, origin) {
  if (typeof raw !== 'string' || !raw.trim() || typeof origin !== 'string' || !origin) return '';
  try {
    const base = new URL(raw.trim(), origin);
    const localHttp = ['localhost', '127.0.0.1'].includes(base.hostname) && base.protocol === 'http:';
    if (base.protocol !== 'https:' && !localHttp) return '';
    if (base.username || base.password || base.search || base.hash) return '';
    const allowedPath = base.pathname === '/' || (base.pathname === '/commerce-api' && (base.origin === origin || base.origin === 'https://osgard.world'));
    if (!allowedPath) return '';
    if (base.origin !== origin && !base.protocol.startsWith('https:')) return '';
    return base.origin + (base.pathname === '/' ? '' : base.pathname);
  } catch {
    return '';
  }
}

export function buildLeadMessage({ projectType = '', budget = '', contact = '', description = '', attribution = {} } = {}) {
  const lines = [
    'Заявка OSGARD / разработка цифрового продукта',
    '',
    'Тип проекта: ' + String(projectType).trim(),
    'Бюджет: ' + (String(budget).trim() || 'не указан'),
    'Контакт для ответа: ' + String(contact).trim(),
    '',
    'Описание задачи:',
    String(description).trim(),
    '',
    'Источник: ' + safeSlug(attribution.source || 'direct', 'direct'),
    'Кампания: ' + safeSlug(attribution.campaign || '', '') ,
    'Игровой источник: ' + (GAME_IDS.has(String(attribution.gameId || '')) ? attribution.gameId : 'unknown'),
  ];
  return lines.join('\n').slice(0, 4200);
}
