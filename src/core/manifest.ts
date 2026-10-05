export type OsgardWorldId = 'play' | 'business' | 'create' | 'mobility' | 'media' | 'vpn' | 'marcosa'

export type OsgardGameId = 'time' | 'swarm' | 'null-shift' | 'inherit' | 'remix'

export type OsgardEventName =
  | 'portal_opened'
  | 'game_opened'
  | 'game_session_started'
  | 'game_session_completed'
  | 'score_submitted'
  | 'business_diagnostic_started'
  | 'site_builder_opened'
  | 'mobility_route_requested'
  | 'profile_opened'
  | 'share_created'

export interface OsgardEvent<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  id: string
  name: OsgardEventName
  userId?: string
  world?: OsgardWorldId
  game?: OsgardGameId
  payload: TPayload
  occurredAt: string
  schemaVersion: 1
}

export const OSGARD_WORLDS: ReadonlyArray<{ id: OsgardWorldId, label: string, promise: string }> = [
  { id: 'play', label: 'OSGARD PLAY', promise: 'Играть и возвращаться за новым испытанием.' },
  { id: 'business', label: 'OSGARD BUSINESS', promise: 'Находить точки роста и потери.' },
  { id: 'create', label: 'OSGARD CREATE', promise: 'Превращать идею в работающий прототип.' },
  { id: 'mobility', label: 'OSGARD MOBILITY', promise: 'Находить лучший маршрут.' },
  { id: 'media', label: 'OSGARD MEDIA', promise: 'Показывать продукт сильнее.' },
  { id: 'vpn', label: 'GARD VPN', promise: 'Защищать соединение без лишнего шума.' },
  { id: 'marcosa', label: 'MARCOSA', promise: 'Собирать личный цифровой мир.' },
]

export const OSGARD_GAMES: ReadonlyArray<{ id: OsgardGameId, title: string, reason: string, href: string }> = [
  { id: 'time', title: 'ИМПЕРИЯ ВРЕМЕНИ', reason: 'управлять', href: '/games/time-empire/' },
  { id: 'swarm', title: 'SWARM', reason: 'координироваться', href: '/games/swarm/index.html' },
  { id: 'null-shift', title: 'NULL//SHIFT', reason: 'проникать', href: '/games/null-shift/index.html' },
  { id: 'inherit', title: 'INHERIT', reason: 'наследовать', href: '/games/inherit/index.html' },
  { id: 'remix', title: 'REMIX', reason: 'создавать', href: '/games/remix/index.html' },
]

