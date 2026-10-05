import { Archive, ArrowUpRight, Bell, Clock3 } from 'lucide-react'
import { useMemo } from 'react'
import { meaningfulNotifications, SEASON_EVENTS } from './core/liveops'

type StoredEvent = { name: string, occurredAt: string }

export function ArchiveSurface() {
  const events = useMemo<StoredEvent[]>(() => {
    try { return JSON.parse(localStorage.getItem('osgard.core.events.v1') ?? '[]') as StoredEvent[] } catch { return [] }
  }, [])
  const notes = meaningfulNotifications(events.map(event => event.name))
  return <main className="archive-page">
    <Archive className="archive-icon" />
    <p className="eyebrow">OSGARD CORE / ARCHIVE</p>
    <h1>Ваши действия<br />остаются.</h1>
    {notes.length > 0 && <div className="archive-notices">{notes.map(note => <div className="archive-notice" key={note}><Bell />{note}</div>)}</div>}
    <section className="archive-season"><div><span>SEASON 01</span><strong>THE FIRST SIGNAL</strong></div><small>{SEASON_EVENTS.length} событий в пяти мирах</small></section>
    <section className="archive-events">{events.length ? events.slice().reverse().map((event, index) => <article key={`${event.occurredAt}-${index}`}><Clock3 /><div><strong>{event.name}</strong><span>{new Date(event.occurredAt).toLocaleString('ru-RU')}</span></div><ArrowUpRight /></article>) : <p>Откройте мир, чтобы в архиве появился первый след.</p>}</section>
  </main>
}
