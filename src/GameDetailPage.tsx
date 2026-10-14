import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUpRight, Check, ExternalLink,
  Gamepad2, Heart, Maximize2, MessageCircle, Monitor, Play, Share2,
  Smartphone, X,
} from 'lucide-react'
import { OsgardLogo } from './OsgardLogo'
import { recordOsgardEvent } from './core/eventQueue'
import { getRelatedGames, type RecommendationReason } from './core/gameRecommendations.mjs'
// @ts-expect-error Runtime-only JavaScript helper, covered by a Node smoke suite.
import { createSessionClock, isTrustedGameLifecycleMessage } from './core/gameSessionLifecycle.mjs'
import type { OsgardEventName } from './core/manifest'
import './games-hub.css'

type Locale = 'ru' | 'en'
type Category = 'all' | 'strategy' | 'coop' | 'tactical' | 'world' | 'creative'
type DeviceFilter = 'all' | 'desktop' | 'mobile'
type Consent = 'granted' | 'denied' | null

type GameDefinition = {
  id: string
  mark: string
  titleRu: string
  titleEn: string
  category: Exclude<Category, 'all'>
  genreRu: string
  genreEn: string
  descriptionRu: string
  descriptionEn: string
  href: string
  devices: DeviceFilter[]
  controlsRu: string
  controlsEn: string
  supportRu: string
  supportEn: string
  featuresRu: string[]
  featuresEn: string[]
  theme: string
}

const GAMES: GameDefinition[] = [
  {
    id: 'time',
    mark: 'ET',
    titleRu: 'ИМПЕРИЯ ВРЕМЕНИ',
    titleEn: 'EMPIRE OF TIME',
    category: 'strategy',
    genreRu: 'Сюжетная стратегия',
    genreEn: 'Story strategy',
    descriptionRu: 'Развивайте живой город: распоряжайтесь казной и энергией, стройте районы и договаривайтесь с фракциями. У каждого решения есть последствия.',
    descriptionEn: 'Shape a living city: manage the treasury and energy, develop districts and negotiate with factions. Every decision has consequences.',
    href: '/games/time',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Кликайте по районам, действиям совета и строительным карточкам. На телефоне используйте те же элементы интерфейса.',
    controlsEn: 'Select districts, council actions and building cards. On phones, use the same interface controls.',
    supportRu: 'Интерактивная React-игра внутри портала. Режим сохранения и диагностики реализован в самой игре.',
    supportEn: 'An interactive React game inside the portal. Save-state and diagnostics are implemented in the game itself.',
    featuresRu: ['Экономика и ресурсы', 'Районы и строительство', 'Фракции и летопись решений'],
    featuresEn: ['Economy and resources', 'Districts and construction', 'Factions and decision chronicle'],
    theme: 'time',
  },
  {
    id: 'swarm',
    mark: 'SW',
    titleRu: 'SWARM',
    titleEn: 'SWARM',
    category: 'coop',
    genreRu: 'Кооперативная симуляция',
    genreEn: 'Co-op simulation',
    descriptionRu: 'Одна команда — разные роли. Координируйте движение, синхронизируйте действия и добудьте ядро до окончания миссии.',
    descriptionEn: 'One crew, different roles. Coordinate movement, synchronize actions and extract the core before the mission ends.',
    href: '/games/swarm/index.html',
    devices: ['desktop', 'mobile'],
    controlsRu: 'ПК: WASD, пробел и F. На сенсорных устройствах предусмотрены отдельные экранные кнопки движения, прыжка и захвата.',
    controlsEn: 'Desktop: WASD, Space and F. Touch devices have dedicated on-screen move, jump and grab controls.',
    supportRu: 'Браузерная игра с разметкой сенсорного управления. Для онлайн-комнат требуется подключение к сети.',
    supportEn: 'A browser game with explicit touch controls. Online rooms require a network connection.',
    featuresRu: ['Роли команды', 'Онлайн-комната', 'Миссия и экстракция'],
    featuresEn: ['Team roles', 'Online room', 'Mission and extraction'],
    theme: 'swarm',
  },
  {
    id: 'null-shift',
    mark: 'NS',
    titleRu: 'NULL//SHIFT',
    titleEn: 'NULL//SHIFT',
    category: 'tactical',
    genreRu: 'Тактический рейд',
    genreEn: 'Tactical raid',
    descriptionRu: 'Проникните на объект, взломайте узлы, переключайте реальность и извлеките ядро. Следите за тревогой и нестабильностью.',
    descriptionEn: 'Infiltrate a facility, breach nodes, shift reality and extract the core. Watch the alarm and instability levels.',
    href: '/games/null-shift-godot/index.html',
    devices: ['desktop', 'mobile'],
    controlsRu: 'ПК: клавиатура и мышь. Для телефона предусмотрены виртуальный джойстик и сенсорные кнопки действий.',
    controlsEn: 'Desktop: keyboard and mouse. Phones have a virtual joystick and touch action controls.',
    supportRu: 'В репозитории доступна самостоятельная браузерная версия. Отдельный Godot-проект хранится отдельно от веб-версии.',
    supportEn: 'A standalone browser build is present in the repository. The Godot project is maintained separately from the web build.',
    featuresRu: ['Тактическая арена', 'Переключение слоёв', 'Показатели рейда и экстракция'],
    featuresEn: ['Tactical arena', 'Reality-layer shifting', 'Raid telemetry and extraction'],
    theme: 'shift',
  },
  {
    id: 'inherit',
    mark: 'IN',
    titleRu: 'INHERIT',
    titleEn: 'INHERIT',
    category: 'world',
    genreRu: 'Живой мир и наследие',
    genreEn: 'Living world',
    descriptionRu: 'Оставьте след в меняющемся мире и передайте его следующему поколению. Летопись, объекты и история складываются в персональное наследие.',
    descriptionEn: 'Leave a trace in a changing world and pass it to the next generation. Chronicle, objects and history become a personal legacy.',
    href: '/games/inherit/index.html',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Основные действия доступны через интерфейс самой игры. На компьютере удобнее широкое окно; на телефоне проверьте все панели перед длинной сессией.',
    controlsEn: 'Core actions are available through the game UI. A wide window is more comfortable on desktop; on phones, check each panel before a long session.',
    supportRu: 'HTML-игра с локальным сохранением и поддержкой установки. Общая летопись требует настроенного серверного API; без него поколения остаются локальными.',
    supportEn: 'An installable HTML game with device-local saves. Shared lineage requires a configured server API; otherwise generations remain local.',
    featuresRu: ['Смена поколений', 'Объекты и действия', 'Экспорт и перенос истории'],
    featuresEn: ['Generational change', 'Objects and actions', 'History export and transfer'],
    theme: 'inherit',
  },
  {
    id: 'remix',
    mark: 'RX',
    titleRu: 'REMIX',
    titleEn: 'REMIX',
    category: 'creative',
    genreRu: 'Арена создателей',
    genreEn: 'Creator arena',
    descriptionRu: 'Создавайте испытания, пробуйте пользовательские сценарии и возвращайтесь к проверяемой истории матча там, где доступен игровой сервер.',
    descriptionEn: 'Create challenges, try player scenarios and revisit a verifiable match history where the game server is available.',
    href: '/games/remix/index.html',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Управление через элементы веб-интерфейса. Для сетевых функций требуется доступность игрового API.',
    controlsEn: 'Use the web interface controls. Network features require the game API to be reachable.',
    supportRu: 'Статическая точка входа и серверные возможности описаны в проекте; фактический статус сервера следует проверять в рабочем окружении.',
    supportEn: 'A static entry point and server features are represented in the project; verify live server status in the deployed environment.',
    featuresRu: ['Конструктор испытаний', 'Игровые сценарии', 'История результатов'],
    featuresEn: ['Challenge builder', 'Player scenarios', 'Result history'],
    theme: 'remix',
  },
  {
    id: 'signal-run',
    mark: 'SR',
    titleRu: 'SIGNAL RUN',
    titleEn: 'SIGNAL RUN',
    category: 'creative',
    genreRu: 'Аркада на реакцию',
    genreEn: 'Reflex arcade',
    descriptionRu: 'Управляй сигналом на трёх полосах, собирай световые фрагменты и избегай цифровых помех. Импульс помогает очистить маршрут и пережить опасный момент.',
    descriptionEn: 'Steer your signal across three lanes, collect bright shards and dodge digital hazards. The pulse clears nearby danger and helps you survive a tight moment.',
    href: '/games/signal-run/',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Стрелки влево/вправо или A/D меняют полосу. Q или кнопка импульса активирует щит. На телефоне доступны крупные сенсорные кнопки.',
    controlsEn: 'Left/right arrows or A/D change lanes. Q or the Pulse button triggers a shield. Large touch controls are available on phones.',
    supportRu: 'Самостоятельная браузерная Canvas-игра без внешних библиотек. Личный рекорд хранится локально в этом браузере; сетевой рейтинг не заявлен.',
    supportEn: 'A standalone Canvas browser game with no external libraries. Your personal best is stored locally; no online leaderboard is claimed.',
    featuresRu: ['Три полосы и растущая скорость', 'Щит-импульс с перезарядкой', 'Локальный рекорд и короткие забеги'],
    featuresEn: ['Three lanes and rising speed', 'Pulse shield with cooldown', 'Local best and short runs'],
    theme: 'signal',
  },
  {
    id: 'civic-cascade',
    mark: 'CC',
    titleRu: 'CIVIC CASCADE',
    titleEn: 'CIVIC CASCADE',
    category: 'strategy',
    genreRu: 'Кризисная стратегия',
    genreEn: 'Crisis strategy',
    descriptionRu: 'Город входит в цепочку отказов. Стабилизируйте энергосеть, удерживайте воду и открывайте безопасные маршруты эвакуации, пока кризисы усиливают друг друга.',
    descriptionEn: 'A city is entering a chain of system failures. Stabilize the power grid, control flood water and open safe evacuation routes before the crises compound.',
    href: '/games/civic-cascade/',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Выбирайте узлы городской карты касанием или щелчком. Затем разверните насосы, стабилизируйте сеть, откройте эвакуационный путь или отправьте ремонтные бригады.',
    controlsEn: 'Select city map nodes by click or touch. Then deploy pumps, stabilize the grid, open an evacuation route or dispatch repair crews.',
    supportRu: 'Самостоятельная HTML-игра с мышью и сенсорным управлением. Операцию можно сохранить и восстановить на этом устройстве; прогноз риска на 30 игровых секунд является приближённой оценкой по текущим трендам.',
    supportEn: 'A standalone HTML game with mouse and touch controls. Operations can be saved and restored on this device; the 30-game-second risk outlook is an approximate extrapolation of current trends.',
    featuresRu: ['Каскадные городские кризисы', 'Локальное сохранение и восстановление операции', 'Ориентировочный прогноз риска на 30 игровых секунд'],
    featuresEn: ['Cascading urban crises', 'Local operation checkpoints', 'Approximate 30-game-second risk outlook'],
    theme: 'civic',
  },
  {
    id: 'patina',
    mark: 'PA',
    titleRu: 'PATINA ATELIER',
    titleEn: 'PATINA ATELIER',
    category: 'creative',
    genreRu: 'Симуляция консервации',
    genreEn: 'Conservation puzzle',
    descriptionRu: 'Исследуйте керамическую плитку 1898 года, отличайте загрязнение от оригинальной глазури и нестабильных солей, выбирая бережное вмешательство.',
    descriptionEn: 'Study an 1898 ceramic tile, distinguish residue from original glaze and unstable salts, and choose a careful conservation intervention.',
    href: '/games/patina/',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Выберите участок поверхности, проведите диагностику и пробы, затем решите, что стабилизировать или очищать. Итоговое заключение и журнал дела сохраняются локально.',
    controlsEn: 'Select a surface area, run diagnostics and tests, then decide what to stabilize or clean. The final report and case journal are stored locally.',
    supportRu: 'Самостоятельная HTML-игра с локальным журналом и экспортом дела в JSON. Показатели — внутренняя игровая модель, не реальные лабораторные измерения и не инструкция для настоящей реставрации.',
    supportEn: 'A standalone HTML game with a local casebook and JSON export. Metrics are in-game simulation, not real laboratory measurements or real-world conservation advice.',
    featuresRu: ['Три зоны поверхности', 'Диагностика и ограниченные действия', 'Заключение и локальный экспорт дела'],
    featuresEn: ['Three surface zones', 'Diagnostics and limited actions', 'Conclusion and local case export'],
    theme: 'patina',
  },


  {
    id: 'cascade-lab',
    mark: 'CL',
    titleRu: 'CASCADE LAB',
    titleEn: 'CASCADE LAB',
    category: 'creative',
    genreRu: 'Физическая головоломка',
    genreEn: 'Physics puzzle',
    descriptionRu: 'Собирай цепные реакции из шести механизмов и исследуй физику. Версия 0.26 добавляет Robustness Lab: 12–48 повторных прогонов текущего чертежа на настоящем игровом движке с фиксированным шагом 120 Гц. Стенд отдельно проверяет углы механизмов, микросмещение установки и начальный импульс, чтобы показать, насколько результат чувствителен к небольшим отклонениям. Серия воспроизводима по зерну; чертёж в игре не меняется, результаты сохраняются локально. Это стресс-тест игровой модели, не аттестация реального устройства.',
    descriptionEn: 'Build chain reactions with six devices and explore the physics. Version 0.26 adds Robustness Lab: 12–48 repeat runs of the current blueprint on the actual game engine at a fixed 120 Hz step. It separately probes device angles, small placement offsets and launch impulse to show how sensitive a result is to controlled deviations. Sweeps are reproducible by seed; the live blueprint is unchanged and results stay local. This stress-tests the game model, not a real-world device.',
    href: '/games/cascade-lab/',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Выберите механизм в панели, размещайте детали касанием или мышью и запускайте испытание. Используйте паузу и пошаговый режим для изучения движения; на телефоне доступен сенсорный интерфейс.',
    controlsEn: 'Choose a device from the panel, place parts with touch or mouse and launch the experiment. Use pause and step mode to inspect motion; touch controls are available on mobile.',
    supportRu: 'Самостоятельная HTML-игра с локальными сохранениями, диагностикой и личным журналом попыток. Журнал не отправляется на сервер; физика — игровая модель, а не проверенный инженерный симулятор. Глобальный рейтинг не заявлен.',
    supportEn: 'A self-contained HTML game with local saves, diagnostics and a personal attempt ledger. The ledger is not uploaded; physics is an in-game model, not a validated engineering simulator. No global leaderboard is claimed.',
    featuresRu: ['Шесть интерактивных механизмов', 'Adaptive Mission Director: контракты восстановления, эффективности, скорости и стабильности', 'Передаваемые ссылки на те же испытания со сроком действия 30 дней', 'Robustness Lab 0.26: 12–48 воспроизводимых стресс-прогонов на игровом движке', 'Три изолированные группы возмущений: угол, установка, начальный импульс', 'Доля доставок, группы отказов и карта конечных позиций', 'Локальный экспорт стресс-серии в JSON и CSV без сетевой отправки', 'Локальная летопись контрактов и Research XP без денежной стоимости', 'История отмены/повтора до 50 изменений', 'Журнал успешных и неудачных попыток', 'Достижения по личным результатам', 'Экспорт JSON/CSV и проверенный импорт журнала', 'Engineering OS: 30 улучшений диагностики', 'Experiment Studio: контролируемые исследования с базой и до пяти наблюдений', 'Case Passport: проверяемый файл чертежа и результата', 'Trajectory X-Ray: карта движения и график скорости по кадрам', 'Метки физических событий и быстрый переход к выбранному событию', 'Сравнение траекторий одного сценария и измерение среднего отклонения', 'Локальный архив до 18 записей X-Ray с импортом/экспортом JSON и CSV', 'Социальные кнопки делятся кратким итогом, не личными заметками', 'Витрина OSGARD с частотой показа на выбор'],
    featuresEn: ['Six interactive devices', 'Adaptive Mission Director contracts for recovery, efficiency, speed and consistency', 'Shareable challenge links with a 30-day expiry', 'Robustness Lab 0.26: 12–48 reproducible stress trials on the game engine', 'Three isolated perturbation groups: angle, placement, launch impulse', 'Delivery rate, failure groups and final-position map', 'Local JSON/CSV stress-sweep export without network upload', 'Local contract history and non-monetary Research XP', 'Undo/redo history for up to 50 changes', 'Journal of successful and failed attempts', 'Achievements based on personal results', 'JSON/CSV export and validated ledger import', 'Engineering OS with 30 diagnostic improvements', 'Experiment Studio: controlled studies with a baseline and up to five observations', 'Case Passport: verifiable blueprint and run result file', 'Trajectory X-Ray: frame-by-frame motion map and speed chart', 'Physics-event markers and jump-to-event navigation', 'Same-scenario trajectory overlay and measured mean deviation', 'Local X-Ray archive of up to 18 runs with JSON/CSV export and JSON import', 'Social buttons share summary-only links, not private notes', 'OSGARD showcase with configurable frequency'],
    theme: 'cascade-lab',
  },
  {
    id: 'afterimage-run',
    mark: 'AR',
    titleRu: 'AFTERIMAGE//RUN',
    titleEn: 'AFTERIMAGE//RUN',
    category: 'creative',
    genreRu: 'Ежедневный sci-fi speedrun',
    genreEn: 'Daily sci-fi speedrun',
    descriptionRu: 'Пробегите ежедневный sci-fi маршрут, уклоняйтесь от препятствий, собирайте SIGNAL SHARDS и используйте PHASE DASH. У игроков один daily seed; отправьте вызов другу, чтобы он попробовал пройти тот же маршрут.',
    descriptionEn: 'Run the daily sci-fi route, dodge hazards, collect SIGNAL SHARDS and trigger PHASE DASH. Players share the daily seed; invite a friend to attempt the same route.',
    href: '/games/afterimage-run/',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Прыжок: пробел, стрелка вверх или касание игровой арены. PHASE DASH: Shift или экранная кнопка. Escape ставит игру на паузу.',
    controlsEn: 'Jump: Space, Arrow Up or tap the arena. PHASE DASH: Shift or the on-screen button. Escape pauses the run.',
    supportRu: 'AFTERIMAGE//RUN v1.5.0 — самостоятельная HTML5 Canvas-игра. Лучший результат и призрачный маршрут сохраняются локально в этом браузере; облачное сохранение и глобальный серверный рейтинг не заявлены.',
    supportEn: 'AFTERIMAGE//RUN v1.5.0 is a standalone HTML5 Canvas game. Best score and ghost route are stored locally in this browser; cloud saves and a global server leaderboard are not claimed.',
    featuresRu: ['Релиз v1.5.0 · ежедневный seed', 'Призрачный маршрут и вызов другу', 'PHASE DASH, сенсорный прыжок и экспорт диагностики'],
    featuresEn: ['v1.5.0 release · daily seed', 'Ghost route and friend challenge', 'PHASE DASH, touch jump and diagnostics export'],
    theme: 'afterimage-run',
  },
  {
    id: 'aether-grid',
    mark: 'AG',
    titleRu: 'AETHER GRID',
    titleEn: 'AETHER GRID',
    category: 'creative',
    genreRu: 'Ежедневная логическая головоломка',
    genreEn: 'Daily logic puzzle',
    descriptionRu: 'Соедините источник с ядром в сети из 25 узлов. Ежедневная одинаковая сетка, личный рекорд и вызов другу — без установки и регистрации.',
    descriptionEn: 'Connect the source to the core through a network of 25 nodes. One shared daily board, a local personal best and a challenge for a friend — no install or account required.',
    href: '/games/aether-grid/',
    devices: ['desktop', 'mobile'],
    controlsRu: 'Нажимайте на узлы, чтобы поворачивать соединения. Подсказка исправляет один узел и добавляет штраф в три хода. На клавиатуре доступны стрелки при фокусе и клавиши R/H/S.',
    controlsEn: 'Tap nodes to rotate connections. A hint fixes one node and adds a three-move penalty. Keyboard focus navigation and R/H/S shortcuts are available.',
    supportRu: 'Самостоятельная HTML-головоломка. Ежедневная сетка зависит от UTC-даты, рекорд хранится локально. Общий рейтинг или серверная синхронизация результата не заявлены.',
    supportEn: 'A self-contained HTML puzzle. The daily board is UTC-date seeded and best scores stay in local browser storage. No global leaderboard or server-side score sync is claimed.',
    featuresRu: ['Единый ежедневный вызов', 'Путь сигнала и поворот узлов', 'Личный рекорд и приглашение друга'],
    featuresEn: ['Shared daily challenge', 'Signal routing and node rotation', 'Local best and friend invite'],
    theme: 'aether-grid',
  },
]


const FAVORITES_KEY = 'osgard.games.favorites.v1'
const RECENT_KEY = 'osgard.games.recent.v1'
const ANALYTICS_CONSENT_KEY = 'osgard.games.analytics-consent.v1'
const DETAIL_LOCALE_KEY = 'osgard.games.detail-locale.v1'
const KNOWN_GAME_IDS = new Set(GAMES.map(game => game.id))
function readLocale(): Locale { try { return localStorage.getItem(DETAIL_LOCALE_KEY) === 'en' ? 'en' : 'ru' } catch { return 'ru' } }
const EMAIL = 'osman.osmanov0099@gmail.com'
const WHATSAPP = 'https://wa.me/79640027222'

function readStringList(key: string): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    if (!Array.isArray(parsed)) return []
    const limit = key === RECENT_KEY ? 5 : KNOWN_GAME_IDS.size
    return [...new Set(parsed.filter((item): item is string => typeof item === 'string' && KNOWN_GAME_IDS.has(item)))].slice(0, limit)
  } catch { return [] }
}

function readConsent(): Consent {
  try {
    const value = localStorage.getItem(ANALYTICS_CONSENT_KEY)
    return value === 'granted' || value === 'denied' ? value : null
  } catch {
    return null
  }
}

function storeStringList(key: string, items: string[]) {
  const limit = key === RECENT_KEY ? 5 : KNOWN_GAME_IDS.size
  const safeItems = [...new Set(items.filter(item => KNOWN_GAME_IDS.has(item)))].slice(0, limit)
  try { localStorage.setItem(key, JSON.stringify(safeItems)) } catch { /* local features are optional */ }
}

function storeConsent(value: Exclude<Consent, null>) {
  try { localStorage.setItem(ANALYTICS_CONSENT_KEY, value) } catch { /* consent remains in memory */ }
}

function track(name: OsgardEventName, payload: Record<string, unknown>, consent: Consent) {
  if (consent !== 'granted') return
  try { recordOsgardEvent(name, payload) } catch { /* analytics must never block gameplay */ }
}

function gameTitle(game: GameDefinition, locale: Locale) {
  return locale === 'ru' ? game.titleRu : game.titleEn
}

function gameDescription(game: GameDefinition, locale: Locale) {
  return locale === 'ru' ? game.descriptionRu : game.descriptionEn
}

function recommendationReasonLabel(reason: RecommendationReason, locale: Locale) {
  const labels: Record<RecommendationReason, [string, string]> = {
    favorite: ['В избранном', 'In your favorites'],
    curated: ['Подобрано к этому миру', 'Curated for this world'],
    genre: ['Похожий жанр', 'Similar genre'],
    discover: ['Открой новый жанр', 'Discover a new genre'],
  }
  return labels[reason][locale === 'ru' ? 0 : 1]
}

function formatProjectType(value: string, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    game: ['Разработка игры', 'Game development'],
    site: ['Сайт или веб-платформа', 'Website or web platform'],
    app: ['Приложение', 'Application'],
    platform: ['Цифровая платформа', 'Digital platform'],
    other: ['Другая задача', 'Other project'],
  }
  return labels[value]?.[locale === 'ru' ? 0 : 1] ?? value
}

function useLocalCatalogState() {
  const [favorites, setFavorites] = useState<string[]>(() => readStringList(FAVORITES_KEY))
  const [recent, setRecent] = useState<string[]>(() => readStringList(RECENT_KEY))
  const [consent, setConsent] = useState<Consent>(readConsent)
  const remember = (id: string) => {
    const next = [id, ...readStringList(RECENT_KEY).filter(item => item !== id)].slice(0, 5)
    storeStringList(RECENT_KEY, next)
    setRecent(next)
  }
  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter(item => item !== id) : [id, ...favorites]
    storeStringList(FAVORITES_KEY, next)
    setFavorites(next)
    track('portal_opened', { surface: 'games-catalog', action: 'favorite_toggled', game: id, active: next.includes(id) }, consent)
  }
  const chooseConsent = (value: Exclude<Consent, null>) => {
    storeConsent(value)
    setConsent(value)
  }
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === FAVORITES_KEY) setFavorites(readStringList(FAVORITES_KEY))
      if (event.key === null || event.key === RECENT_KEY) setRecent(readStringList(RECENT_KEY))
      if (event.key === null || event.key === ANALYTICS_CONSENT_KEY) setConsent(readConsent())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return { favorites, recent, consent, remember, toggleFavorite, chooseConsent }
}


function ShieldGlyph() {
  return <svg width="28" height="32" viewBox="0 0 28 32" aria-hidden="true"><path d="M14 2 25 6v8c0 7-4.7 12-11 16C7.7 26 3 21 3 14V6z" fill="none" stroke="currentColor" strokeWidth="1.4" /><path d="m9 15 3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg>
}

export function GameDetailPage({ slug }: { slug: string }) {
  const game = GAMES.find(item => item.id === slug)
  const [locale, setLocale] = useState<Locale>(readLocale)
  const ru = locale === 'ru'
  const { favorites, recent, consent, remember, toggleFavorite, chooseConsent } = useLocalCatalogState()
  const [playing, setPlaying] = useState(() => new URLSearchParams(window.location.search).get('launch') === '1')
  const [loadingGame, setLoadingGame] = useState(true)
  const [frameError, setFrameError] = useState(false)
  const [notice, setNotice] = useState('')
  const [consentPanelOpen, setConsentPanelOpen] = useState(() => readConsent() === null)
  const stageRef = useRef<HTMLDivElement>(null)
  const detailTracked = useRef<string | null>(null)
  const consentRef = useRef<Consent>(consent)
  consentRef.current = consent
  const frameReadyCallback = useRef<(() => void) | null>(null)
  const frameValidatedRef = useRef(false)
  const launchButtonRef = useRef<HTMLButtonElement | null>(null)
  const wasPlayingRef = useRef(playing)
  const [frameAttempt, setFrameAttempt] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const chooseLocale = (value: Locale) => {
    setLocale(value)
    try { localStorage.setItem(DETAIL_LOCALE_KEY, value) } catch { /* keep in memory */ }
  }

  useEffect(() => {
    if (!game) {
      document.title = 'Game not found — OSGARD WORLD'
      return
    }
    const title = gameTitle(game, locale) + ' — OSGARD WORLD'
    document.title = title
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (meta) meta.content = gameDescription(game, locale)
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.appendChild(canonical) }
    const canonicalUrl = 'https://osgard.world/game/' + game.id
    const description = gameDescription(game, locale)
    canonical.href = canonicalUrl
    const setMeta = (selector: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector)
      if (!element) { element = document.createElement('meta'); document.head.appendChild(element) }
      element.setAttribute('content', value)
    }
    setMeta('meta[name="description"]', description)
    setMeta('meta[property="og:title"]', title)
    setMeta('meta[property="og:description"]', description)
    setMeta('meta[property="og:url"]', canonicalUrl)
    setMeta('meta[name="twitter:title"]', title)
    setMeta('meta[name="twitter:description"]', description)
    const schema = { '@context': 'https://schema.org', '@type': 'VideoGame', name: gameTitle(game, locale), description, genre: locale === 'ru' ? game.genreRu : game.genreEn, gamePlatform: 'Web browser', applicationCategory: 'Game', url: canonicalUrl, publisher: { '@type': 'Organization', name: 'OSGARD WORLD', url: 'https://osgard.world/' } }
    let script = document.head.querySelector<HTMLScriptElement>('script[data-game-schema]')
    if (!script) { script = document.createElement('script'); script.type = 'application/ld+json'; script.dataset.gameSchema = 'true'; document.head.appendChild(script) }
    script.textContent = JSON.stringify(schema)
  }, [game?.id, locale])

  useEffect(() => {
    if (game && consent === 'granted' && detailTracked.current !== game.id) {
      detailTracked.current = game.id
      track('game_opened', { game: game.id, surface: 'game-detail' }, consent)
    }
  }, [game?.id, consent])

  useEffect(() => {
    if (playing && game) {
      remember(game.id)
      setLoadingGame(true)
      setFrameError(false)
    }
  }, [playing, game?.id])

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    syncFullscreen()
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === DETAIL_LOCALE_KEY) setLocale(readLocale())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const wasPlaying = wasPlayingRef.current
    wasPlayingRef.current = playing
    if (playing) {
      const timer = window.setTimeout(() => stageRef.current?.querySelector('iframe')?.focus({ preventScroll: true }), 100)
      return () => window.clearTimeout(timer)
    }
    if (wasPlaying) launchButtonRef.current?.focus({ preventScroll: true })
  }, [playing, frameAttempt])

  useEffect(() => {
    if (!playing || !game || frameError) return
    const launchedAt = Date.now()
    const clock = createSessionClock()
    let sessionStarted = false, terminal = false, ready = false, startMethod = ''
    let timeoutId: number | null = null
    let boundDocument: Document | null = null
    let interactionHandler: EventListener | null = null
    const pauseReasons = new Set<string>()
    const clearTimeoutSafely = () => { if (timeoutId !== null) window.clearTimeout(timeoutId); timeoutId = null }
    const clearInteraction = () => {
      if (boundDocument && interactionHandler) {
        boundDocument.removeEventListener('pointerdown', interactionHandler, true)
        boundDocument.removeEventListener('keydown', interactionHandler, true)
      }
      boundDocument = null; interactionHandler = null
    }
    const startSession = (method: string) => {
      if (terminal || sessionStarted || !clock.start(performance.now())) return
      sessionStarted = true
      startMethod = method
      clearInteraction()
      if (pauseReasons.size) clock.pause(performance.now())
      track('game_session_started', { game: game.id, surface: 'game-detail', startMethod: method }, consentRef.current)
    }
    const finishSession = (reason: string) => {
      if (terminal) return
      terminal = true
      clearTimeoutSafely()
      clearInteraction()
      const summary = clock.finish(performance.now())
      if (!summary) return
      track('game_session_completed', { game: game.id, surface: 'game-detail', durationSeconds: Math.floor(summary.durationMs / 1000), endReason: reason, startMethod }, consentRef.current)
    }
    const setPauseReason = (reason: string, active: boolean) => {
      const pausedBefore = pauseReasons.size > 0
      if (active) pauseReasons.add(reason); else pauseReasons.delete(reason)
      const pausedAfter = pauseReasons.size > 0
      if (!pausedBefore && pausedAfter) clock.pause(performance.now())
      else if (pausedBefore && !pausedAfter) clock.resume(performance.now())
    }
    const bindFirstInteraction = () => {
      ready = true
      clearTimeoutSafely()
      if (sessionStarted || terminal) return
      const frame = stageRef.current?.querySelector('iframe')
      let doc: Document | null = null
      try { doc = frame?.contentDocument ?? null } catch { return }
      if (!doc?.body || boundDocument === doc) return
      boundDocument = doc
      interactionHandler = () => startSession('first-iframe-interaction')
      doc.addEventListener('pointerdown', interactionHandler, true)
      doc.addEventListener('keydown', interactionHandler, true)
    }
    frameReadyCallback.current = bindFirstInteraction
    if (document.hidden) pauseReasons.add('document-hidden')
    const onMessage = (event: MessageEvent) => {
      const frame = stageRef.current?.querySelector('iframe')
      if (!frame?.contentWindow || !isTrustedGameLifecycleMessage({
        origin: event.origin, expectedOrigin: window.location.origin,
        source: event.source, expectedSource: frame.contentWindow,
        data: event.data, gameId: game.id, launchedAt, now: Date.now(),
      })) return
      const message = event.data as { state: string; flowType?: string }
      if (message.state === 'ready') { bindFirstInteraction(); setLoadingGame(false); return }
      if (message.state === 'started') {
        ready = true; clearTimeoutSafely(); clearInteraction(); setLoadingGame(false)
        startSession('game-lifecycle'); return
      }
      if (message.state === 'paused') { setPauseReason('game-paused', true); return }
      if (message.state === 'resumed') { setPauseReason('game-paused', false); return }
      if (message.state === 'completed') { finishSession('game_completed'); return }
      if (message.state === 'share_created') {
        const allowedFlows = ['daily-challenge', 'score-duel', 'solution-link', 'result-card', 'friend-invite']
        const flowType = typeof message.flowType === 'string' && allowedFlows.includes(message.flowType) ? message.flowType : undefined
        track('share_created', { game: game.id, surface: 'game-detail-iframe', ...(flowType ? { flowType } : {}) }, consentRef.current)
        return
      }
      if (message.state === 'error') {
        finishSession('game_error'); setLoadingGame(false); setFrameError(true)
        setNotice(ru ? 'Игровой клиент сообщил об ошибке. Повтори запуск или открой его отдельно.' : 'The game client reported an error. Retry or open it separately.')
      }
    }
    const onVisibilityChange = () => setPauseReason('document-hidden', document.hidden)
    const onPageHide = () => finishSession('pagehide')
    window.addEventListener('message', onMessage)
    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('pagehide', onPageHide)
    if (!ready) timeoutId = window.setTimeout(() => {
      if (ready || terminal) return
      setLoadingGame(false); setFrameError(true)
      setNotice(ru ? 'Не удалось подтвердить готовность игры за 18 секунд. Повтори запуск или открой её отдельно.' : 'Game readiness was not confirmed within 18 seconds. Retry or open it separately.')
      finishSession('launch_timeout')
    }, 18_000)
    if (frameValidatedRef.current) bindFirstInteraction()
    return () => {
      clearTimeoutSafely(); clearInteraction()
      window.removeEventListener('message', onMessage)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      if (frameReadyCallback.current === bindFirstInteraction) frameReadyCallback.current = null
      finishSession('player_closed')
    }
  }, [playing, frameAttempt, frameError, game?.id])

  const startPlaying = () => {
    if (!game) return
    remember(game.id)
    frameValidatedRef.current = false
    setLoadingGame(true)
    setFrameError(false)
    setPlaying(true)
  }

  const shareGame = async () => {
    if (!game) return
    const url = window.location.origin + '/game/' + game.id
    track('share_dialog_opened', { game: game.id, surface: 'game-detail' }, consent)
    try {
      if (navigator.share) {
        await navigator.share({ title: gameTitle(game, locale), text: gameDescription(game, locale), url })
        setNotice(ru ? 'Окно отправки закрыто. Факт отправки не подтверждается браузером.' : 'Share sheet closed. The browser cannot confirm delivery.')
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
        track('share_link_copied', { game: game.id, surface: 'game-detail' }, consent)
        setNotice(ru ? 'Ссылка скопирована.' : 'Link copied.')
      } else setNotice(ru ? 'Скопируйте ссылку из адресной строки.' : 'Copy the link from the address bar.')
    } catch (error) {
      if (typeof DOMException !== 'undefined' && error instanceof DOMException && error.name === 'AbortError') {
        setNotice(ru ? 'Отправка отменена. Никакая отправка не засчитана.' : 'Sharing cancelled. No share was counted.')
        return
      }
      setNotice(ru ? 'Не удалось поделиться. Скопируйте URL из адресной строки.' : 'Sharing failed. Copy the URL from the address bar.')
    }
  }

  const toggleFullscreen = () => {
    const stage = stageRef.current
    if (!stage) return
    if (document.fullscreenElement === stage) {
      if (typeof document.exitFullscreen !== 'function') { setNotice(ru ? 'Выход из полноэкранного режима недоступен.' : 'Exit fullscreen is not available.'); return }
      void document.exitFullscreen().catch(() => setNotice(ru ? 'Не удалось выйти из полноэкранного режима.' : 'Could not exit fullscreen.'))
      return
    }
    if (typeof stage.requestFullscreen !== 'function') { setNotice(ru ? 'Полноэкранный режим недоступен в этом браузере.' : 'Fullscreen is not available in this browser.'); return }
    void stage.requestFullscreen().catch(() => setNotice(ru ? 'Полноэкранный режим заблокирован браузером.' : 'Fullscreen was blocked by the browser.'))
  }

  if (!game) return <main className="gh-page gh-not-found"><a href="/games/"><ArrowLeft size={16} />{ru ? 'Вернуться в каталог' : 'Back to games'}</a><p className="gh-eyebrow">404 / WORLD NOT FOUND</p><h1>{ru ? 'Этого мира нет в каталоге.' : 'This world is not in the catalog.'}</h1><p>{ru ? 'Проверьте ссылку или выберите одну из доступных игр.' : 'Check the URL or choose one of the available games.'}</p><a className="gh-primary" href="/games">{ru ? 'Открыть игры' : 'Open games'}<ArrowRight size={16} /></a></main>

  const relatedGames = getRelatedGames(game, GAMES, { favorites, recent }, 3)

  return <main className={'gh-page gh-detail-page gh-detail--' + game.theme}>
    <header className="gh-header">
      <a className="gh-brand" href="/" aria-label="OSGARD WORLD — главная"><OsgardLogo /></a>
      <nav className="gh-nav" aria-label={ru ? 'Навигация игр' : 'Games navigation'}><a href="/games">{ru ? 'Все игры' : 'All games'}</a><a href="/worlds">{ru ? 'Миры' : 'Worlds'}</a><a href="/development">{ru ? 'Разработка' : 'Development'}</a></nav>
      <div className="gh-header-actions"><button className="gh-language" type="button" onClick={() => chooseLocale(ru ? 'en' : 'ru')}>{ru ? 'RU ↔ EN' : 'EN ↔ RU'}</button><a className="gh-contact-link" href={WHATSAPP} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} />{ru ? 'Обсудить игру' : 'Build a game'}</a></div>
    </header>

    <div className="gh-detail-wrap">
      <div className="gh-breadcrumb"><a href="/games"><ArrowLeft size={14} />{ru ? 'Все игровые миры' : 'All game worlds'}</a><span>/</span><span>{gameTitle(game, locale)}</span><button type="button" onClick={() => void shareGame()}><Share2 size={15} />{ru ? 'Поделиться' : 'Share'}</button><button type="button" className={favorites.includes(game.id) ? 'is-active' : ''} aria-pressed={favorites.includes(game.id)} onClick={() => toggleFavorite(game.id)}><Heart size={15} fill={favorites.includes(game.id) ? 'currentColor' : 'none'} />{favorites.includes(game.id) ? (ru ? 'В избранном' : 'Saved') : (ru ? 'В избранное' : 'Save')}</button></div>

      {!playing ? <>
        <section className="gh-detail-hero">
          <div className="gh-detail-copy"><p className="gh-eyebrow">OSGARD PLAY / {game.id.toUpperCase()}</p><h1>{gameTitle(game, locale)}</h1><p className="gh-detail-genre">{ru ? game.genreRu : game.genreEn}</p><p className="gh-detail-description">{gameDescription(game, locale)}</p><div className="gh-detail-pills"><span><Gamepad2 size={14} />{ru ? 'В браузере' : 'Browser-based'}</span>{(game.devices.includes('desktop') || game.devices.includes('all')) && <span><Monitor size={14} />{ru ? 'ПК' : 'Desktop'}</span>}{(game.devices.includes('mobile') || game.devices.includes('all')) && <span><Smartphone size={14} />{ru ? 'Сенсорный интерфейс' : 'Touch interface'}</span>}</div><div className="gh-detail-actions"><button ref={launchButtonRef} className="gh-primary" type="button" onClick={startPlaying}><Play size={17} fill="currentColor" />{ru ? 'Запустить игру' : 'Launch game'}<ArrowRight size={16} /></button><a className="gh-secondary" href={game.href} target="_blank" rel="noopener noreferrer">{ru ? 'Открыть отдельно' : 'Open standalone'}<ExternalLink size={15} /></a></div></div>
          <div className="gh-detail-art" aria-hidden="true"><div className="gh-detail-ring gh-detail-ring-one" /><div className="gh-detail-ring gh-detail-ring-two" /><div className="gh-detail-mark">{game.mark}</div><span>{game.genreEn.toUpperCase()}</span><small>OSGARD WORLD / PLAY</small></div>
        </section>
        <section className="gh-detail-info-grid"><article><p className="gh-eyebrow">01 / INPUT</p><h2>{ru ? 'Управление' : 'Controls'}</h2><p>{ru ? game.controlsRu : game.controlsEn}</p></article><article><p className="gh-eyebrow">02 / PLATFORM</p><h2>{ru ? 'Совместимость' : 'Compatibility'}</h2><p>{ru ? game.supportRu : game.supportEn}</p><small>{ru ? 'Фактическую производительность проверяйте на целевом устройстве и браузере.' : 'Verify actual performance on the target device and browser.'}</small></article><article><p className="gh-eyebrow">03 / FEATURES</p><h2>{ru ? 'Что внутри' : 'What is inside'}</h2><ul>{(ru ? game.featuresRu : game.featuresEn).map(feature => <li key={feature}><Check size={14} />{feature}</li>)}</ul></article></section>
      </> : <section className="gh-play-screen">
        <div className="gh-play-toolbar"><div><span className="gh-play-live" /><strong>{gameTitle(game, locale)}</strong><small>{ru ? 'Игровая сессия' : 'Game session'}</small></div><div><a href={game.href} target="_blank" rel="noopener noreferrer">{ru ? 'Открыть в отдельной вкладке' : 'Open in new tab'}<ExternalLink size={14} /></a><button type="button" onClick={toggleFullscreen} aria-pressed={isFullscreen} aria-label={isFullscreen ? (ru ? 'Выйти из полноэкранного режима' : 'Exit fullscreen') : (ru ? 'На весь экран' : 'Fullscreen')}><Maximize2 size={15} />{isFullscreen ? (ru ? 'Выйти из полного экрана' : 'Exit fullscreen') : (ru ? 'На весь экран' : 'Fullscreen')}</button><button type="button" onClick={() => setPlaying(false)}><X size={15} />{ru ? 'Закрыть игру' : 'Close game'}</button></div></div>
        <div className="gh-game-stage" ref={stageRef} tabIndex={-1} aria-label={ru ? 'Игровая сцена' : 'Game stage'}>
          {loadingGame && !frameError && <div className="gh-game-loading" role="status" aria-live="polite"><span className="gh-loader" aria-hidden="true" /><p>{ru ? 'Подключаем игровой мир…' : 'Loading game world…'}</p></div>}
          {frameError ? <div className="gh-game-error" role="alert"><p>{ru ? 'Не удалось загрузить встроенную игру.' : 'The embedded game could not be loaded.'}</p><div className="gh-game-error-actions"><button className="gh-secondary" type="button" onClick={() => { frameValidatedRef.current = false; setFrameError(false); setLoadingGame(true); setFrameAttempt(value => value + 1) }}>{ru ? 'Повторить запуск' : 'Retry launch'}</button><a className="gh-primary" href={game.href} target="_blank" rel="noopener noreferrer">{ru ? 'Открыть игру отдельно' : 'Open game separately'}<ExternalLink size={15} /></a></div></div> : <iframe key={frameAttempt} tabIndex={0} title={gameTitle(game, locale)} src={game.href} onLoad={() => {
            let attempts = 0
            const validateFrame = () => {
              try {
                const frame = stageRef.current?.querySelector('iframe')
                const frameDocument = frame?.contentDocument
                const frameTitle = frameDocument?.title ?? ''
                const titleChecks: Record<string, RegExp> = {
                  time: /империя времени|empire of time/i,
                  swarm: /swarm/i,
                  'null-shift': /null\s*\/\s*\/?\s*shift|null\s*shift/i,
                  inherit: /inherit/i,
                  remix: /remix/i,
                  'signal-run': /signal\s*run/i,
                  'civic-cascade': /civic\s*cascade/i,
                  patina: /patina\s*atelier/i,
                  'afterimage-run': /afterimage\s*\/\s*\/\s*run/i,
                }
                const validTitle = game.id === 'time'
                  ? Boolean(frameDocument?.querySelector('.time-game'))
                  : game.id === 'civic-cascade'
                    ? Boolean(frameDocument?.querySelector('#cc-game-root') && frameDocument?.querySelector('#cc-status'))
                    : game.id === 'patina'
                      ? Boolean(frameDocument?.body.dataset.patinaReady === 'true' && frameDocument?.querySelector('#patina-workbench'))
                      : game.id === 'signal-run'
                        ? Boolean(frameDocument?.querySelector('#arena') && frameDocument?.querySelector('#start'))
                        : game.id === 'cascade-lab'
                          ? Boolean(frameDocument?.body.dataset.cascadeLabReady === 'true')
                          : game.id === 'aether-grid'
                            ? Boolean(frameDocument?.querySelector('#board') && frameDocument?.querySelector('#challenge-code'))
                            : (titleChecks[game.id]?.test(frameTitle) ?? false)
                if (validTitle) {
                  frameValidatedRef.current = true
                  setLoadingGame(false)
                  frameReadyCallback.current?.()
                  return
                }
                // The strategy page is a React SPA; wait for its component to mount
                // instead of interpreting the initial HTML shell as a failed launch.
                if (attempts < 20) {
                  attempts += 1
                  window.setTimeout(validateFrame, 250)
                  return
                }
                setLoadingGame(false)
                setFrameError(true)
              } catch {
                setLoadingGame(false)
                setFrameError(true)
              }
            }
            validateFrame()
          }} onError={() => { frameValidatedRef.current = false; setLoadingGame(false); setFrameError(true); setNotice(ru ? 'Браузер не смог загрузить игровой клиент.' : 'The browser could not load the game client.') }} allow="fullscreen; gamepad; clipboard-write" allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin" aria-describedby="gh-play-note" />}
        </div>
        <p id="gh-play-note" className="gh-play-note">{ru ? 'Игра выполняется в отдельном встроенном окне. Если управление или сетевой режим работают некорректно, откройте её в отдельной вкладке.' : 'The game runs in an embedded frame. If controls or network play do not work correctly, open it in a separate tab.'}</p>
      </section>}

      <section className="gh-related"><div className="gh-section-heading"><div><p className="gh-eyebrow">NEXT / CONTINUE EXPLORING</p><h2>{ru ? 'Другие игровые миры' : 'More game worlds'}</h2></div><a className="gh-text-link" href="/games">{ru ? 'Весь каталог' : 'Full catalog'}<ArrowUpRight size={15} /></a></div><div className="gh-related-grid">{relatedGames.map(({ game: item, reason }) => <a href={'/game/' + item.id} key={item.id} className={'gh-related-card gh-related-card--' + item.theme}><span>{item.mark}</span><div><small>{ru ? item.genreRu : item.genreEn}</small><strong>{gameTitle(item, locale)}</strong><em className="gh-related-reason">{recommendationReasonLabel(reason, locale)}</em></div><ArrowUpRight size={15} /></a>)}</div></section>
    </div>

    <footer className="gh-footer"><a href="/" className="gh-footer-brand"><OsgardLogo variant="footer" /></a><span>© OSGARD WORLD · PLAY WITH PURPOSE</span><div><a href="/privacy">{ru ? 'Конфиденциальность' : 'Privacy'}</a><a href="/terms">{ru ? 'Условия' : 'Terms'}</a><button type="button" onClick={() => setConsentPanelOpen(true)}>{ru ? 'Настройки аналитики' : 'Analytics settings'}</button></div></footer>
    {consentPanelOpen && <div className="gh-consent" role="dialog" aria-modal="true" aria-labelledby="gh-consent-title"><div className="gh-consent-mark"><ShieldGlyph /></div><div className="gh-consent-copy"><strong id="gh-consent-title">{ru ? 'Вы управляете игровой аналитикой' : 'You control game analytics'}</strong><p>{ru ? 'События игрового раздела отправляются только после согласия. Избранное и история используются локально.' : 'Games-section events are sent only after consent. Favorites and history are stored locally.'}</p></div><div className="gh-consent-actions"><button type="button" className="gh-consent-accept" onClick={() => { chooseConsent('granted'); setConsentPanelOpen(false) }}><Check size={15} />{ru ? 'Разрешить' : 'Allow'}</button><button type="button" className="gh-consent-deny" onClick={() => { chooseConsent('denied'); setConsentPanelOpen(false) }}>{ru ? 'Не разрешать' : 'Decline'}</button><button type="button" className="gh-consent-close" onClick={() => setConsentPanelOpen(false)} aria-label={ru ? 'Закрыть настройки' : 'Close settings'}><X size={15} /></button></div></div>}
    {notice && <div className="gh-toast" role="status">{notice}<button type="button" onClick={() => setNotice('')} aria-label={ru ? 'Закрыть уведомление' : 'Dismiss notice'}><X size={14} /></button></div>}
  </main>
}
