import { useCallback, useEffect, useRef, useState } from 'react'

type Props = { onComplete: () => void }

export function Preloader({ onComplete }: Props) {
  const [leaving, setLeaving] = useState(false)
  const [muted, setMuted] = useState(true)
  const completed = useRef(false)

  const finish = useCallback(() => {
    if (completed.current) return
    completed.current = true
    window.sessionStorage.setItem('osgard-preloader-seen-v2', '1')
    setLeaving(true)
    window.setTimeout(onComplete, 520)
  }, [onComplete])

  useEffect(() => {
    if (window.location.pathname === '/miniapp') {
      onComplete()
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(finish, reduced ? 700 : 5000)
    return () => window.clearTimeout(timer)
  }, [finish, onComplete])

  return (
    <div className={`access-preloader${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="OSGARD access">
      <div className="access-atmosphere" aria-hidden="true" />
      <div className="access-seal" aria-hidden="true">
        <span className="access-ring access-ring-outer" />
        <span className="access-ring access-ring-inner" />
        <span className="celestial-emblem"><i /><b /><em /></span>
        <span className="celestial-wordmark">OSGARD</span>
        <span className="celestial-submark"><i />WORLD<i /></span>
      </div>
      <div className="access-caption" aria-live="polite">
        <span>ENTER THE CONSTELLATION</span>
        <i />
        <b>2026 / OSGARD WORLD</b>
      </div>
      <div className="access-controls">
        <button type="button" onClick={finish}>Skip</button>
        <button type="button" onClick={() => setMuted(value => !value)} aria-pressed={muted}>
          {muted ? 'Sound off' : 'Sound on'}
        </button>
      </div>
    </div>
  )
}
