import { Eye, Film, Radio, Users } from 'lucide-react'
import { useState } from 'react'
import { recordOsgardEvent } from './core/eventQueue'

type Mode = 'LIVE' | 'SPECTATOR' | 'REPLAY' | 'CHALLENGE'
const modes: Array<{ id: Mode; label: string; icon: typeof Radio }> = [{ id: 'LIVE', label: 'LIVE', icon: Radio }, { id: 'SPECTATOR', label: 'SPECTATOR', icon: Eye }, { id: 'REPLAY', label: 'REPLAY', icon: Film }, { id: 'CHALLENGE', label: 'CHALLENGE', icon: Users }]

export function StreamSurface() {
  const [mode, setMode] = useState<Mode>('LIVE')
  const choose = (next: Mode) => { setMode(next); recordOsgardEvent('portal_opened', { surface: 'stream', mode: next }) }
  return <main className="stream-page"><p className="eyebrow">OSGARD LIVE / STREAM MODE</p><h1>Смотри, как<br />меняется мир.</h1><p className="stream-lead">События, матчи и испытания в минимальном HUD — только действие и его последствия.</p><nav className="stream-modes" aria-label="Stream modes">{modes.map(item => { const Icon = item.icon; return <button className={mode === item.id ? 'is-active' : ''} onClick={() => choose(item.id)} key={item.id}><Icon />{item.label}</button> })}</nav><section className="stream-stage"><div className="stream-signal"><span className="stream-dot" />{mode === 'LIVE' ? 'LIVE SIGNAL' : mode}</div><div className="stream-grid"><div><span>WORLD</span><strong>{mode === 'CHALLENGE' ? 'REMIX / ARENA 04' : mode === 'REPLAY' ? 'TIME / YEAR 50' : 'SWARM / FACILITY 04'}</strong></div><div><span>VIEWERS</span><strong>{mode === 'SPECTATOR' ? '2 184' : '846'}</strong></div><div><span>STATE</span><strong>{mode === 'REPLAY' ? 'ARCHIVED' : 'IN MOTION'}</strong></div></div><button className="stream-primary" onClick={() => recordOsgardEvent('share_created', { surface: 'stream', mode })}>Открыть событие <Radio /></button></section></main>
}
