import { Globe2, Send, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

type Community = { clubs?: Array<{ id: string; name: string; theme: string }>; friends?: Array<{ friendshipId: string; playerId: string; status: string; createdAt: number }> }

export function CommunitySurface() {
  const [community, setCommunity] = useState<Community>({})
  const [playerId, setPlayerId] = useState('')
  const [status, setStatus] = useState('')
  const token = localStorage.getItem('osgard.auth.accessToken')
  const headers = token ? { authorization: `Bearer ${token}`, 'content-type': 'application/json' } : null
  const load = () => { if (!headers) return; void fetch('/api/v1/player/community', { headers }).then(response => response.ok ? response.json() as Promise<Community> : null).then(value => { if (value) setCommunity(value) }).catch(() => undefined) }
  useEffect(load, [])
  const sendRequest = () => { const target = playerId.trim(); if (!headers || !target || target.length > 128) { setStatus('Введите корректный OSGARD ID.') ; return }; void fetch('/api/v1/player/friends', { method: 'POST', headers, body: JSON.stringify({ playerId: target }) }).then(response => { setStatus(response.ok ? 'Запрос отправлен.' : response.status === 409 ? 'Запрос уже существует.' : 'Не удалось отправить запрос.'); if (response.ok) { setPlayerId(''); load() } }).catch(() => setStatus('Сервис временно недоступен.')) }
  const decide = (friendshipId: string, next: 'accepted' | 'rejected') => { if (!headers) return; void fetch(`/api/v1/player/friends/${friendshipId}/status`, { method: 'POST', headers, body: JSON.stringify({ status: next }) }).then(response => { setStatus(response.ok ? (next === 'accepted' ? 'Запрос принят.' : 'Запрос отклонён.') : 'Не удалось обновить запрос.'); if (response.ok) load() }).catch(() => setStatus('Сервис временно недоступен.')) }
  return <main className="community-page"><Globe2 className="community-icon" /><p className="eyebrow">OSGARD COMMUNITY / NETWORK</p><h1>Связи<br />становятся мирами.</h1><p className="community-lead">Клубы, союзники и создатели, которые двигают сезон вместе.</p><section className="community-grid"><div><h2><Users /> Клубы</h2>{community.clubs?.length ? community.clubs.map(club => <article key={club.id}><strong>{club.name}</strong><span>{club.theme}</span></article>) : <p>Войдите в OSGARD ID, чтобы открыть клубы.</p>}</div><div><h2><Users /> Друзья</h2>{community.friends?.length ? community.friends.map(friend => <article key={friend.playerId}><strong>{friend.playerId}</strong><span>{friend.status}</span>{friend.status === 'pending' && <span className="community-actions"><button onClick={() => decide(friend.friendshipId, 'accepted')}>Принять</button><button onClick={() => decide(friend.friendshipId, 'rejected')}>Отклонить</button></span>}</article>) : <p>Здесь появятся ваши союзники и их события.</p>}<div className="community-request"><label>OSGARD ID<input value={playerId} onChange={event => setPlayerId(event.target.value)} placeholder="player-id" /></label><button onClick={sendRequest} disabled={!headers}><Send /> Отправить запрос</button>{status && <small>{status}</small>}</div></div></section></main>
}
