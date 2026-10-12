import { GamesHub } from './GamesHub'

type Locale = 'ru' | 'en'

export function EntertainmentCatalog({ locale, setLocale }: { locale: Locale; setLocale: (value: Locale) => void }) {
  return <GamesHub locale={locale} setLocale={setLocale} />
}
