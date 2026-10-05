import { ArrowUpRight, Compass } from 'lucide-react'
import { useMemo } from 'react'
import { nextRecommendation } from './core/recommendations'
import type { OsgardEvent } from './core/manifest'
export function Recommendations() { const recommendation = useMemo(() => { try { return nextRecommendation(JSON.parse(localStorage.getItem('osgard.core.events.v1') ?? '[]') as OsgardEvent[]) } catch { return null } }, []); return <main className="recommendations-page"><Compass /><p className="eyebrow">OSGARD CORE / NEXT WORLD</p><h1>Следующий<br />шаг уже рядом.</h1>{recommendation ? <a href={recommendation.href}><span>{recommendation.world}</span><strong>{recommendation.reason}</strong><ArrowUpRight /></a> : <p>Откройте игру, диагностику, CREATE или маршрут, чтобы CORE выбрал следующий мир.</p>}</main> }
