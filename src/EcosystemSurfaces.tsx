import { ArrowRight, Camera, Globe2, Play, Users } from 'lucide-react'
import { useState } from 'react'
import { recordOsgardEvent } from './core/eventQueue'
import { listPlayerReplays, listPlayerResults, submitPlayerResult } from './core/playerApi'

type Kind = 'marcosa' | 'media' | 'chronicle'
const content = {
  marcosa: { eyebrow: 'MARCOSA / YOUR DIGITAL WORLD', title: 'Ваш цифровой мир.', text: 'Профиль, группы, архив и люди вокруг ваших проектов.', action: 'Войти в MARCOSA', icon: Users },
  media: { eyebrow: 'OSGARD MEDIA / STUDIO', title: 'Ваш продукт. Наша камера.', text: 'Соберите сценарий, кадр и первый ролик в одном рабочем потоке.', action: 'Собрать ролик', icon: Camera },
  chronicle: { eyebrow: 'OSGARD CHRONICLE / 2026', title: 'История продолжается.', text: 'Хроника решений, игр и миров OSGARD.', action: 'Открыть архив', icon: Globe2 },
} as const

export function EcosystemSurface({ kind }: { kind: Kind }) {
  const item = content[kind]; const Icon = item.icon
  const [active, setActive] = useState(false); const [format, setFormat] = useState('LAUNCH FILM'); const [title, setTitle] = useState(''); const [drafted, setDrafted] = useState(false); const [draftCount, setDraftCount] = useState(0); const [replayCount, setReplayCount] = useState(0)
  const open = () => { recordOsgardEvent(kind === 'marcosa' ? 'profile_opened' : 'portal_opened', { surface: kind }); setActive(true); if (kind === 'media') { void listPlayerResults('media-clip').then(items => setDraftCount(items.length)); void listPlayerReplays('media-clip').then(items => setReplayCount(items.length)) } }
  const createClip = () => { const clipTitle = title.trim(); if (!clipTitle) return; recordOsgardEvent('portal_opened', { surface: 'media', action: 'clip_draft_created', format, title: clipTitle }); void submitPlayerResult('media-clip', { resultId: `clip-${Date.now()}`, score: 0, format, title: clipTitle, status: 'draft' }); setDrafted(true); setDraftCount(count => count + 1) }
  return <main className={`surface-page surface-${kind}`}>
    <div className="surface-hero"><div><p className="eyebrow">{item.eyebrow}</p><h1>{item.title}</h1><p>{item.text}</p><button onClick={open}>{active ? 'Открыто' : item.action} <ArrowRight /></button></div><div className="surface-object"><Icon /><strong>{kind === 'marcosa' ? 'M' : kind === 'media' ? 'PLAY' : '2026'}</strong>{kind === 'media' && <Play className="surface-play" />}</div></div>
    {active && <section className="surface-detail">
      {kind === 'media' && <span className="surface-replay-count">REPLAYS {replayCount}</span>}
      {kind === 'marcosa' && <><span>MY OSGARD</span><b>12 связей · 4 проекта · 7 миров</b></>}
      {kind === 'chronicle' && <><span>ЛЕНТА СОБЫТИЙ</span><b>Октябрь — запуск игры · Ноябрь — первые игроки · Декабрь — новый мир</b></>}
      {kind === 'media' && <><span>SHOT / PROCESS / RESULT · DRAFTS {draftCount}</span>{drafted ? <b>Черновик «{title}» создан · {format}</b> : <><label>Формат<select value={format} onChange={event => setFormat(event.target.value)}><option>LAUNCH FILM</option><option>PRODUCT STORY</option><option>GAME CLIP</option></select></label><label>Название<input value={title} onChange={event => setTitle(event.target.value)} placeholder="Название ролика" /></label><button onClick={createClip}>Создать черновик <ArrowRight /></button></>}</>}
    </section>}
  </main>
}
