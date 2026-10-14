import React, { useEffect, useState } from 'react'

const LivingGlobe = React.lazy(() =>
  import('./LivingGlobe').then(module => ({ default: module.LivingGlobe })),
)

function GlobePlaceholder() {
  return (
    <div
      className="globe globe-placeholder"
      role="img"
      aria-label="Static OSGARD ecosystem illustration"
      style={{
        position: 'relative',
        display: 'grid',
        placeItems: 'center',
        borderRadius: '50%',
        background: 'radial-gradient(circle at 38% 32%, rgba(212,175,55,.18), rgba(8,20,42,.12) 38%, transparent 72%)',
        contain: 'layout paint style',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '68%',
          aspectRatio: '1',
          border: '1px solid rgba(212,175,55,.34)',
          borderRadius: '50%',
          boxShadow: 'inset 0 0 48px rgba(59,130,246,.09), 0 0 65px rgba(212,175,55,.09)',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '84%',
          height: '34%',
          border: '1px solid rgba(200,169,110,.32)',
          borderRadius: '50%',
          transform: 'rotate(-32deg)',
        }}
      />
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          width: '78%',
          height: '48%',
          border: '1px solid rgba(100,150,220,.18)',
          borderRadius: '50%',
          transform: 'rotate(47deg)',
        }}
      />
    </div>
  )
}

/**
 * Keep the expensive Three.js graph out of the first paint.
 * Users requesting reduced motion retain the lightweight static globe.
 */
export function DeferredLivingGlobe() {
  const [shouldLoad, setShouldLoad] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const delay = window.matchMedia('(max-width: 760px)').matches ? 1400 : 850
    const timer = window.setTimeout(() => setShouldLoad(true), delay)
    return () => window.clearTimeout(timer)
  }, [])

  if (!shouldLoad) return <GlobePlaceholder />
  return (
    <React.Suspense fallback={<GlobePlaceholder />}>
      <LivingGlobe />
    </React.Suspense>
  )
}
