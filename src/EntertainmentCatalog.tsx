import { useEffect } from 'react'

type Locale = 'ru' | 'en'

// Preserve the historic URL but consolidate the public game experience into /games/.
export function EntertainmentCatalog(_props: { locale: Locale, setLocale: (v: Locale) => void }) {
  useEffect(() => {
    const query = window.location.search
    window.location.replace('/games/' + query)
  }, [])
  return <main style={{ minHeight: '100vh', display: 'grid', placeContent: 'center', gap: 14, padding: 24, background: '#080b10', color: '#f5f3ed', textAlign: 'center' }}>
    <p style={{ color: '#d7b978', letterSpacing: '.16em', fontSize: 11 }}>OSGARD PLAY</p>
    <h1 style={{ fontFamily: 'Georgia, serif', fontWeight: 400 }}>Открываем игровые миры…</h1>
    <a href="/games/" style={{ color: '#f0d9a1' }}>Перейти в каталог игр ↗</a>
  </main>
}
