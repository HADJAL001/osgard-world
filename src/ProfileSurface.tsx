import { Award, Bell, Crown, Palette, UserRound } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { listPlayerNotifications, loadPlayerProfile, savePlayerProfile, type PlayerNotification } from './core/playerApi'

const frames = ['CHAMPAGNE', 'CYAN', 'ROSE']

export function ProfileSurface() {
  const [frame, setFrame] = useState('CHAMPAGNE')
  const [notifications, setNotifications] = useState<PlayerNotification[]>([])
  useEffect(() => { void loadPlayerProfile().then(profile => { if (profile?.avatarFrame && frames.includes(profile.avatarFrame)) setFrame(profile.avatarFrame) }) }, [])
  useEffect(() => { void listPlayerNotifications().then(setNotifications) }, [])
  const chooseFrame = (next: string) => { setFrame(next); void savePlayerProfile({ avatarFrame: next }) }
  const profile = useMemo(() => {
    try { const events = JSON.parse(localStorage.getItem('osgard.core.events.v1') ?? '[]') as Array<{ name: string }>; return { events, xp: events.length * 120 } }
    catch { return { events: [], xp: 0 } }
  }, [])
  const level = Math.floor(profile.xp / 500) + 1
  return <main className="profile-page">
    <div className={`profile-avatar profile-frame-${frame.toLowerCase()}`}><UserRound /></div><p className="eyebrow">OSGARD ID / PROFILE</p><h1>Моя<br />констелляция.</h1><p className="profile-lead">Один профиль для игр, миров, проектов и истории действий.</p>
    <section className="profile-stats"><div><span>УРОВЕНЬ</span><strong>{level}</strong></div><div><span>XP</span><strong>{profile.xp}</strong></div><div><span>СОБЫТИЯ</span><strong>{profile.events.length}</strong></div></section>
    {notifications.length > 0 && <section className="profile-notifications"><h2><Bell /> Уведомления</h2>{notifications.map(item => <article key={item.id}><strong>{item.message}</strong><time>{new Date(item.createdAt).toLocaleString('ru-RU')}</time></article>)}</section>}
    <section className="profile-achievements"><h2><Award /> Достижения</h2><div><article><Crown /><span>Первый сигнал<small>Откройте первый мир</small></span></article><article><Palette /><span>Создатель<small>Соберите прототип в CREATE</small></span></article></div></section>
    <section className="profile-cosmetics"><p className="eyebrow">COSMETICS / AVATAR FRAME</p>{frames.map(item => <button className={frame === item ? 'is-selected' : ''} onClick={() => chooseFrame(item)} key={item}>{item}</button>)}</section>
  </main>
}
