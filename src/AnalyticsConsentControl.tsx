import { ArrowUpRight, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
// @ts-expect-error JavaScript helper has a colocated runtime module.
import { ANALYTICS_CONSENT_KEY, hasAnalyticsConsent, updateAnalyticsConsent } from './core/analyticsConsent.mjs'
import './analytics-consent.css'

type Locale = 'ru' | 'en'

export function AnalyticsConsentControl({ locale }: { locale: Locale }) {
  const isRu = locale === 'ru'
  const [enabled, setEnabled] = useState(() => hasAnalyticsConsent())
  const [status, setStatus] = useState('')

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ANALYTICS_CONSENT_KEY && event.key !== null) return
      const next = hasAnalyticsConsent()
      setEnabled(next)
      setStatus(next
        ? (isRu ? 'Настройка аналитики обновлена в другой вкладке.' : 'Analytics preference was updated in another tab.')
        : (isRu ? 'Аналитика выключена.' : 'Analytics is off.'))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [isRu])

  function toggleConsent() {
    const result = updateAnalyticsConsent(!enabled)
    const next = hasAnalyticsConsent()
    setEnabled(next)
    if (!result.ok) {
      setStatus(isRu
        ? 'Не удалось надёжно сохранить настройку. Проверьте разрешения хранилища браузера.'
        : 'Could not reliably save this choice. Check browser storage permissions.')
      return
    }
    if (next) {
      setStatus(isRu
        ? 'Согласие сохранено. Будут учитываться только будущие события; прежние записи очищены.'
        : 'Consent saved. Only future events may be recorded; previous local analytics records were cleared.')
    } else if (result.cleared) {
      setStatus(isRu
        ? 'Аналитика выключена. Локальные очереди аналитики очищены; игровой прогресс не затронут.'
        : 'Analytics is off. Local analytics queues were cleared; game progress was not changed.')
    } else {
      setStatus(isRu
        ? 'Аналитика выключена, но браузеру не удалось очистить часть локальных записей.'
        : 'Analytics is off, but the browser could not clear some local records.')
    }
  }

  return (
    <section className="osgard-analytics-consent" aria-labelledby="analytics-consent-title">
      <div className="osgard-analytics-consent__copy">
        <p className="osgard-analytics-consent__eyebrow">
          <ShieldCheck aria-hidden="true" /> OSGARD / PRIVACY CONTROL
        </p>
        <h2 id="analytics-consent-title">
          {isRu ? 'Ваш выбор. Ваши данные.' : 'Your choice. Your data.'}
        </h2>
        <p>
          {isRu
            ? 'Необязательная аналитика выключена по умолчанию. Если вы разрешите её, отдельные события использования могут сохраняться локально и отправляться на сервер только при входе и настроенном API. Это не включает рекламные сети.'
            : 'Optional analytics is off by default. If enabled, selected usage events may be stored locally and sent only when you are signed in and the API is configured. This does not enable ad networks.'}
        </p>
        <a href="/privacy/" className="osgard-analytics-consent__privacy">
          {isRu ? 'Политика конфиденциальности' : 'Privacy policy'} <ArrowUpRight aria-hidden="true" />
        </a>
      </div>
      <div className="osgard-analytics-consent__actions">
        <span className={enabled ? 'osgard-analytics-consent__state is-on' : 'osgard-analytics-consent__state'}>
          <i aria-hidden="true" />
          {enabled
            ? (isRu ? 'АНАЛИТИКА РАЗРЕШЕНА' : 'ANALYTICS ALLOWED')
            : (isRu ? 'АНАЛИТИКА ВЫКЛЮЧЕНА' : 'ANALYTICS OFF')}
        </span>
        <button
          className="osgard-analytics-consent__toggle"
          type="button"
          aria-pressed={enabled}
          onClick={toggleConsent}
        >
          {enabled
            ? (isRu ? 'Отключить аналитику' : 'Turn analytics off')
            : (isRu ? 'Разрешить аналитику' : 'Allow analytics')}
        </button>
        <p className="osgard-analytics-consent__status" role="status" aria-live="polite">
          {status || (isRu
            ? 'Настройку можно изменить в любой момент.'
            : 'You can change this choice at any time.')}
        </p>
      </div>
    </section>
  )
}
