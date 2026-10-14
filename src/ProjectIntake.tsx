import { useState, type FormEvent } from 'react'
import { ArrowUpRight, CheckCircle2, CircleAlert, LoaderCircle, Send, ShieldCheck } from 'lucide-react'
import { buildLeadMessage, normalizeLeadAttribution, resolvePublicApiBase } from './core/projectIntake.mjs'
import './project-intake.css'

type Locale = 'ru' | 'en'
type Props = { locale: Locale; botUrl: string }
type IntakeState = 'idle' | 'sending' | 'sent' | 'fallback' | 'error'
type Draft = { projectType: string; budget: string; contact: string; description: string }

const blankDraft: Draft = { projectType: 'game', budget: '', contact: '', description: '' }

const copy = {
  ru: {
    eyebrow: 'OSGARD / PRIVATE PROJECT INTAKE',
    title: 'Начнём с задачи.\nНе с шаблона.',
    intro: 'Опиши идею игры, сайта, приложения или платформы. Заявка попадёт в защищённый контур только если он настроен; в противном случае мы дадим отправить её вручную.',
    project: 'Что создаём?',
    budget: 'Бюджет — по желанию',
    contact: 'Как с тобой связаться?',
    contactHint: 'Email, WhatsApp или Telegram',
    brief: 'Коротко о задаче',
    briefHint: 'Что должен уметь продукт, для кого он и какой результат нужен?',
    consent: 'Согласен на обработку введённых данных для ответа на эту заявку. Данные не используются для необязательной аналитики.',
    privacy: 'Политика конфиденциальности',
    submit: 'Передать заявку',
    sending: 'Отправляем безопасно…',
    projectOptions: [['game', 'Игра / игровая система'], ['website', 'Сайт / интернет-платформа'], ['mobile', 'Мобильное приложение'], ['saas', 'SaaS / AI-продукт'], ['business', 'Автоматизация бизнеса'], ['other', 'Другая идея']],
    budgetOptions: [['', 'Пока не определён'], ['under-50k', 'До 50 000 ₽'], ['50k-150k', '50 000–150 000 ₽'], ['150k-500k', '150 000–500 000 ₽'], ['over-500k', 'От 500 000 ₽'], ['discuss', 'Обсудим после оценки']],
    consentError: 'Нужно подтвердить обработку данных, чтобы отправить заявку.',
    validationError: 'Заполни тип проекта, контакт и описание не короче 10 символов.',
    sentTitle: 'Заявка сохранена',
    sentText: 'Сервер подтвердил сохранение. Это ещё не означает, что договор или сроки согласованы.',
    fallbackTitle: 'Сервер заявок пока не подключён',
    fallbackText: 'Данные не сохранены на сервере. Можно отправить подготовленное сообщение через WhatsApp или email — откроется внешний канал, и ты сам подтвердите отправку.',
    errorTitle: 'Не удалось сохранить заявку',
    errorText: 'Сервер не подтвердил сохранение. Данные остались в форме; попробуй ещё раз или отправь сообщение вручную.',
    apiRejected: 'Сервер отклонил заявку. Проверь поля и согласие, затем попробуй снова.',
    whatsapp: 'Отправить через WhatsApp',
    email: 'Отправить по email',
    retry: 'Попробовать снова',
    newLead: 'Создать другую заявку',
    required: 'Обязательное поле',
    optional: 'Необязательно',
    honeypot: 'Website',
    privacyNote: 'Контактные данные передаются только по нажатию кнопки отправки. Сторонние рекламные и аналитические скрипты формой не запускаются.',
  },
  en: {
    eyebrow: 'OSGARD / PRIVATE PROJECT INTAKE',
    title: 'Start with the brief.\nNot a template.',
    intro: 'Describe a game, website, app or platform. The form uses the secure intake API only when explicitly configured; otherwise you can send the brief manually.',
    project: 'What are we building?',
    budget: 'Budget — optional',
    contact: 'How can we reach you?',
    contactHint: 'Email, WhatsApp or Telegram',
    brief: 'Project brief',
    briefHint: 'What should the product do, who is it for, and what outcome do you need?',
    consent: 'I agree to the provided data being processed to respond to this enquiry. It is not used for optional analytics.',
    privacy: 'Privacy policy',
    submit: 'Send project brief',
    sending: 'Sending securely…',
    projectOptions: [['game', 'Game / game system'], ['website', 'Website / digital platform'], ['mobile', 'Mobile app'], ['saas', 'SaaS / AI product'], ['business', 'Business automation'], ['other', 'Other idea']],
    budgetOptions: [['', 'Not decided'], ['under-50k', 'Under ₽50,000'], ['50k-150k', '₽50,000–150,000'], ['150k-500k', '₽150,000–500,000'], ['over-500k', 'Over ₽500,000'], ['discuss', 'Discuss after scoping']],
    consentError: 'Please confirm data processing to send the enquiry.',
    validationError: 'Enter the project type, a reply contact, and a brief of at least 10 characters.',
    sentTitle: 'Enquiry saved',
    sentText: 'The server confirmed storage. This does not confirm a contract or delivery dates.',
    fallbackTitle: 'The enquiry server is not configured',
    fallbackText: 'Your data was not saved on the server. You can send the prepared message using WhatsApp or email; the external channel opens and you confirm sending.',
    errorTitle: 'Could not save the enquiry',
    errorText: 'The server did not confirm storage. Your draft remains in the form; retry or send it manually.',
    apiRejected: 'The server rejected the enquiry. Check the fields and consent, then retry.',
    whatsapp: 'Send via WhatsApp',
    email: 'Send by email',
    retry: 'Try again',
    newLead: 'Start another enquiry',
    required: 'Required',
    optional: 'Optional',
    honeypot: 'Website',
    privacyNote: 'Contact details are transferred only after you choose to send the request. The form does not activate third-party ads or analytics.',
  },
} as const

export function ProjectIntake({ locale, botUrl }: Props) {
  const ru = locale === 'ru'
  const t = copy[locale]
  const [draft, setDraft] = useState<Draft>(blankDraft)
  const [consent, setConsent] = useState(false)
  const [website, setWebsite] = useState('')
  const [state, setState] = useState<IntakeState>('idle')
  const [statusText, setStatusText] = useState('')
  const [fallback, setFallback] = useState<{ whatsapp: string; email: string } | null>(null)

  const setField = (key: keyof Draft, value: string) => setDraft(current => ({ ...current, [key]: value }))

  function prepareFallback(currentDraft = draft) {
    const attribution = normalizeLeadAttribution(window.location.search)
    const message = buildLeadMessage({ ...currentDraft, attribution })
    setFallback({
      whatsapp: 'https://wa.me/79640027222?text=' + encodeURIComponent(message),
      email: 'mailto:osman.osmanov0099@gmail.com?subject=' + encodeURIComponent('OSGARD — заявка на разработку') + '&body=' + encodeURIComponent(message),
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!consent) {
      setState('error')
      setStatusText(t.consentError)
      return
    }
    if (draft.projectType.trim().length < 2 || draft.contact.trim().length < 3 || draft.description.trim().length < 10) {
      setState('error')
      setStatusText(t.validationError)
      return
    }
    setState('sending')
    setStatusText('')
    setFallback(null)
    const attribution = normalizeLeadAttribution(window.location.search)
    const payload = {
      ...draft,
      description: draft.description.trim(),
      contact: draft.contact.trim(),
      projectType: draft.projectType,
      consent: true,
      website,
      attribution,
    }

    let apiBase = ''
    try {
      const configResponse = await fetch('/games/commerce-config.json', { cache: 'no-store', credentials: 'same-origin' })
      const config = configResponse.ok ? await configResponse.json() as { apiBaseUrl?: unknown } : {}
      apiBase = resolvePublicApiBase(config.apiBaseUrl, window.location.origin)
    } catch {
      apiBase = ''
    }

    if (!apiBase) {
      prepareFallback(draft)
      setState(website.trim() ? 'sent' : 'fallback')
      setStatusText(website.trim() ? '' : t.fallbackText)
      return
    }

    try {
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 10000)
      let response: Response
      try {
        response = await fetch(apiBase + '/v1/leads', {
          method: 'POST',
          credentials: 'omit',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
      } finally {
        window.clearTimeout(timeout)
      }
      const result = await response.json().catch(() => null) as { accepted?: unknown; error?: unknown } | null
      if (response.ok && result?.accepted === true) {
        setState('sent')
        setStatusText(t.sentText)
        setFallback(null)
        setDraft(blankDraft)
        setConsent(false)
        setWebsite('')
        return
      }
      if (response.status >= 500 || response.status === 429) {
        prepareFallback(draft)
        setState('fallback')
        setStatusText(t.fallbackText)
        return
      }
      setState('error')
      setStatusText(t.apiRejected)
      prepareFallback(draft)
    } catch {
      prepareFallback(draft)
      setState('fallback')
      setStatusText(t.fallbackText)
    }
  }

  function resetForm() {
    setDraft(blankDraft)
    setConsent(false)
    setWebsite('')
    setFallback(null)
    setStatusText('')
    setState('idle')
  }

  return (
    <section className="osgard-intake" id="project-intake" aria-labelledby="osgard-intake-title">
      <div className="osgard-intake__intro">
        <p className="osgard-intake__eyebrow"><span aria-hidden="true">✳</span> {t.eyebrow}</p>
        <h3 id="osgard-intake-title">{ru ? <>Начнём с задачи.<br /><em>Не с шаблона.</em></> : <>Start with the brief.<br /><em>Not a template.</em></>}</h3>
        <p>{t.intro}</p>
        <div className="osgard-intake__trust">
          <span><ShieldCheck aria-hidden="true" /> {ru ? 'Явное согласие' : 'Explicit consent'}</span>
          <span><ShieldCheck aria-hidden="true" /> {ru ? 'Без стороннего трекинга' : 'No third-party tracking'}</span>
          <span><ShieldCheck aria-hidden="true" /> {ru ? 'Резервный канал отправки' : 'Fallback contact route'}</span>
        </div>
        <div className="osgard-intake__direct">
          <a href={botUrl} target="_blank" rel="noopener noreferrer">{ru ? 'Открыть Telegram' : 'Open Telegram'} <ArrowUpRight aria-hidden="true" /></a>
          <a href="mailto:osman.osmanov0099@gmail.com">osman.osmanov0099@gmail.com</a>
        </div>
      </div>

      <form className="osgard-intake__form" onSubmit={event => void submit(event)} aria-describedby="osgard-intake-note">
        <div className="osgard-intake__form-head">
          <span>PROJECT / 01</span>
          <small>{ru ? 'Обычно меньше двух минут' : 'Usually under two minutes'}</small>
        </div>
        <label>
          <span>{t.project} <i>*</i></span>
          <select value={draft.projectType} onChange={event => setField('projectType', event.target.value)} required>
            {t.projectOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>{t.budget} <small>{t.optional}</small></span>
          <select value={draft.budget} onChange={event => setField('budget', event.target.value)}>
            {t.budgetOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>{t.contact} <i>*</i></span>
          <input value={draft.contact} onChange={event => setField('contact', event.target.value)} minLength={3} maxLength={180} autoComplete="email" placeholder={t.contactHint} required />
        </label>
        <label>
          <span>{t.brief} <i>*</i></span>
          <textarea value={draft.description} onChange={event => setField('description', event.target.value)} minLength={10} maxLength={1800} rows={4} placeholder={t.briefHint} required />
        </label>
        <label className="osgard-intake__honeypot" aria-hidden="true">
          <span>{t.honeypot}</span>
          <input tabIndex={-1} autoComplete="off" value={website} onChange={event => setWebsite(event.target.value)} />
        </label>
        <label className="osgard-intake__consent">
          <input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required />
          <span>{t.consent} <a href="/privacy/" target="_blank" rel="noopener noreferrer">{t.privacy}</a></span>
        </label>
        <button className="osgard-intake__submit" type="submit" disabled={state === 'sending'}>
          {state === 'sending' ? <LoaderCircle aria-hidden="true" className="is-spinning" /> : state === 'sent' ? <CheckCircle2 aria-hidden="true" /> : <Send aria-hidden="true" />}
          {state === 'sending' ? t.sending : t.submit}
          <ArrowUpRight aria-hidden="true" />
        </button>
        <p id="osgard-intake-note" className="osgard-intake__note">{t.privacyNote}</p>
        {state !== 'idle' && (
          <div className={'osgard-intake__status is-' + state} role="status" aria-live="polite">
            {state === 'sent' ? <CheckCircle2 aria-hidden="true" /> : state === 'error' ? <CircleAlert aria-hidden="true" /> : state === 'fallback' ? <CircleAlert aria-hidden="true" /> : <LoaderCircle aria-hidden="true" />}
            <div>
              <strong>{state === 'sent' ? t.sentTitle : state === 'fallback' ? t.fallbackTitle : state === 'error' ? t.apiRejected : t.sending}</strong>
              <p>{statusText}</p>
              {state === 'sent' && <button type="button" onClick={resetForm}>{t.newLead}</button>}
              {fallback && state !== 'sent' && (
                <div className="osgard-intake__fallback-actions">
                  <a href={fallback.whatsapp} target="_blank" rel="noopener noreferrer">{t.whatsapp} <ArrowUpRight aria-hidden="true" /></a>
                  <a href={fallback.email}>{t.email} <ArrowUpRight aria-hidden="true" /></a>
                  <button type="button" onClick={() => void submit(new Event('submit') as unknown as FormEvent<HTMLFormElement>)}>{t.retry}</button>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </section>
  )
}
