import { useEffect } from 'react'

type Locale = 'ru' | 'en'

export function EntertainmentCatalog({ locale }: { locale: Locale, setLocale: (value: Locale) => void }) {
  useEffect(() => {
    window.location.replace('/games/')
  }, [])

  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#080a0b', color: '#f2f0e8', fontFamily: 'system-ui, sans-serif', textAlign: 'center' }}>
    <div>
      <p style={{ letterSpacing: '.2em', color: '#d3ff69', fontSize: 12 }}>OSGARD WORLD / PLAY</p>
      <h1>{locale === 'ru' ? 'Игровой каталог переехал.' : 'The games catalogue has moved.'}</h1>
      <p>{locale === 'ru' ? 'Открываем единую витрину OSGARD PLAY.' : 'Opening the unified OSGARD PLAY hub.'}</p>
      <a href="/games/" style={{ display: 'inline-block', padding: '12px 18px', background: '#d3ff69', color: '#080a0b', textDecoration: 'none', fontWeight: 700 }}>
        {locale === 'ru' ? 'Открыть игры ↗' : 'Open games ↗'}
      </a>
    </div>
  </main>
}
