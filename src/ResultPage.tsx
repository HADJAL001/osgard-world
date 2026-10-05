import { ArrowUpRight, Copy, Trophy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { recordOsgardEvent } from './core/eventQueue'
import { submitPlayerResult } from './core/playerApi'

export function ResultPage({ id }: { id: string }) {
  const [copied, setCopied] = useState(false)
  useEffect(() => { void submitPlayerResult('null-shift', { score: 87420, resultId: id, mode: 'co-op-raid' }) }, [id])
  const share = async () => { const url = window.location.href; recordOsgardEvent('share_created', { resultId: id, url }); try { await navigator.clipboard.writeText(url); setCopied(true) } catch { window.prompt('Скопируйте ссылку на результат', url) } }
  return <main className="result-page"><p className="eyebrow">OSGARD PLAY / RESULT {id}</p><Trophy className="result-trophy" /><h1>87 420</h1><p className="result-label">МЕСТО В МИРЕ <strong>#{id}</strong></p><p className="result-game">NULL//SHIFT · CO-OP RAID</p><div className="result-actions"><button onClick={share}><Copy />{copied ? 'Ссылка скопирована' : 'Поделиться'}</button><a href="/games/null-shift/index.html">Сыграть ещё <ArrowUpRight /></a><a href="/entertainment">Все игры <ArrowUpRight /></a></div></main>
}
