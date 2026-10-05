export type SeasonId = 'THE_FIRST_SIGNAL' | 'THE_ANOMALY' | 'THE_FRACTURE' | 'THE_ARCHIVE' | 'A-0'
export type SeasonEvent = { id: string, season: SeasonId, game: 'time' | 'swarm' | 'null-shift' | 'inherit' | 'remix', title: string, trigger: string, reward: string }
export const SEASON_EVENTS: ReadonlyArray<SeasonEvent> = [{ id: 'signal-time', season: 'THE_FIRST_SIGNAL', game: 'time', title: 'Первый сигнал', trigger: 'Город получает неизвестный импульс.', reward: 'archive-memory' }, { id: 'signal-swarm', season: 'THE_FIRST_SIGNAL', game: 'swarm', title: 'Пульс в рое', trigger: 'Команда синхронно открывает выход.', reward: 'swarm-signal' }, { id: 'signal-null', season: 'THE_FIRST_SIGNAL', game: 'null-shift', title: 'Нулевая частота', trigger: 'Оператор переключает слой во время погони.', reward: 'operator-mark' }, { id: 'signal-inherit', season: 'THE_FIRST_SIGNAL', game: 'inherit', title: 'Запись без владельца', trigger: 'Семья находит запись старше своего дома.', reward: 'legacy-page' }, { id: 'signal-remix', season: 'THE_FIRST_SIGNAL', game: 'remix', title: 'Challenge от сигнала', trigger: 'Создатель публикует challenge с неизвестным seed.', reward: 'creator-frame' }]
export function meaningfulNotification(events: string[]): string | null { if (events.includes('game_session_completed')) return 'Ваш результат открыл новый маршрут.'; if (events.includes('share_created')) return 'Кто-то может бросить вам ответный вызов.'; if (events.includes('inherit_generation_advanced')) return 'Семейный архив получил новую страницу.'; return null }
const NOTIFICATION_RULES: ReadonlyArray<readonly [string, string]> = [
  ['game_session_completed', 'Ваш результат открыл новый маршрут.'],
  ['share_created', 'Кто-то может бросить вам ответный вызов.'],
  ['inherit_generation_advanced', 'Семейный архив получил новую страницу.'],
  ['media_clip_created', 'Черновик готов: его можно отправить в MEDIA.'],
  ['business_diagnostic_started', 'Диагностика открыла следующий шаг для бизнеса.'],
]
export function meaningfulNotifications(events: string[]): string[] {
  const seen = new Set(events)
  return NOTIFICATION_RULES.filter(([event]) => seen.has(event)).map(([, message]) => message)
}
