import { useState } from 'react'

type Locale = 'ru' | 'en'
const services = [
  { id: 'marcosa', name: 'MARCOSA', category: 'SOCIAL / COMMUNITY', ru: 'Социальная сеть, сообщества и цифровые миры.', en: 'Social networking, communities and digital worlds.', url: 'https://marcosa.club/' },
  { id: 'projects', name: 'OSGARD PROJECTS', category: 'DIGITAL STUDIO', ru: 'Сайты, приложения и цифровые продукты.', en: 'Websites, apps and digital products.', url: 'https://osgardbewworld.com/' },
  { id: 'o2-system', name: 'O2 SYSTEM', category: 'BUSINESS OPERATIONS', ru: 'Инструменты учёта для обменных пунктов.', en: 'Accounting tools for exchange offices.', url: 'https://o2system.art/' },
  { id: 'senjorio', name: 'SENJORIO', category: 'PREMIUM MOBILITY', ru: 'Премиальный сервис такси.', en: 'Premium mobility and taxi service.', url: 'https://senjorio.com/' },
  { id: 'superday', name: 'SUPERDAY', category: 'MAP / DAILY PLANNING', ru: 'Умная карта и планировщик дня.', en: 'Smart map and day planner.', url: 'https://superday.run/' },
  { id: 'myosa', name: 'MYOSA', category: 'AI PLATFORM', ru: 'Инструменты на базе искусственного интеллекта.', en: 'An AI-powered product platform.', url: 'https://myosa.world/' },
] as const

function makeInviteUrl(): string {
  const url = new URL('/games/', window.location.origin)
  url.searchParams.set('utm_source', 'osgard_world')
  url.searchParams.set('utm_medium', 'social_share')
  url.searchParams.set('utm_campaign', 'play_with_friends')
  url.searchParams.set('utm_content', 'home_entertainment')
  return url.href
}

export function PlaySelectLoop({ locale }: { locale: Locale }) {
  const ru = locale === 'ru'
  const [inviteUrl] = useState(makeInviteUrl)
  const [status, setStatus] = useState('')
  const message = ru ? 'Пойдём сыграем в OSGARD PLAY. Выбирай свой мир:' : 'Let’s play OSGARD PLAY. Choose your world:'

  const social = [
    { name: 'Telegram', href: 'https://t.me/share/url?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'WhatsApp', href: 'https://wa.me/?text=' + encodeURIComponent(message + ' ' + inviteUrl) },
    { name: 'VK', href: 'https://vk.com/share.php?url=' + encodeURIComponent(inviteUrl) + '&title=' + encodeURIComponent('OSGARD PLAY') },
    { name: 'X', href: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(inviteUrl) },
  ]

  const shareInvite = async () => {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'OSGARD PLAY', text: message, url: inviteUrl })
        setStatus(ru
          ? 'Приглашение передано в меню отправки. Публикацию соцсетью нельзя подтвердить автоматически; на главной награда не начисляется.'
          : 'The invite was passed to the share sheet. A social post cannot be automatically verified; no reward is granted on the homepage.')
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message + ' ' + inviteUrl)
        setStatus(ru
          ? 'Ссылка на каталог скопирована. SHARDS учитываются только внутри игры после серверной проверки приглашённой сессии и отдельного согласия.'
          : 'Catalog link copied. SHARDS are counted only inside a game after a referred session is verified by the server and the player has opted in.')
      } else {
        setStatus(ru ? 'Быстрая отправка недоступна. Выбери соцсеть ниже.' : 'Quick share is unavailable. Choose a network below.')
      }
    } catch (error) {
      setStatus(error instanceof Error && error.name === 'AbortError'
        ? (ru ? 'Отправка отменена. Награда не начислялась.' : 'Share cancelled. No reward was granted.')
        : (ru ? 'Не удалось отправить приглашение. Выбери соцсеть ниже.' : 'Share failed. Choose a network below.'))
    }
  }

  return <section className="play-select-loop" aria-labelledby="play-select-title">
    <div className="play-select-header">
      <div>
        <p className="play-economy-eyebrow">OSGARD SELECT / OWNED PROJECTS</p>
        <h3 id="play-select-title">{ru ? 'Играй. Выбирай. Открывай другие миры.' : 'Play. Choose. Discover other worlds.'}</h3>
        <p>{ru ? 'Подборка собственных продуктов OSGARD. Никакого автозапуска: ты сам выбираешь, что открыть.' : 'A selection of OSGARD’s own products. Nothing opens automatically — you decide what to explore.'}</p>
      </div>
      <span className="play-select-disclosure">{ru ? 'РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ' : 'ADVERTISING · OSGARD OWNED PROJECTS'}</span>
    </div>
    <div className="play-select-layout">
      <div className="play-select-service-grid">
        {services.map((service, index) => {
          const url = new URL(service.url)
          url.searchParams.set('utm_source', 'osgard_world')
          url.searchParams.set('utm_medium', 'entertainment_select')
          url.searchParams.set('utm_campaign', 'between_worlds')
          url.searchParams.set('utm_content', service.id)
          return <a key={service.id} className={'play-select-service' + (index === 0 ? ' is-featured' : '')} href={url.href} target="_blank" rel="noopener noreferrer">
            <span>{String(index + 1).padStart(2, '0')} / {service.category}</span>
            <strong>{service.name}</strong>
            <p>{ru ? service.ru : service.en}</p>
            <em>{ru ? 'Открыть проект ↗' : 'Explore project ↗'}</em>
          </a>
        })}
        <a className="play-select-service play-select-all" href="/games/?utm_source=osgard_world&amp;utm_medium=entertainment_select&amp;utm_campaign=between_worlds&amp;utm_content=all_services">
          <span>OSG / DIRECTORY</span>
          <strong>{ru ? 'Все игры и сервисы' : 'All games and services'}</strong>
          <p>{ru ? 'Полный каталог, настройки межсессионных подборок и игровые миры.' : 'Full catalog, between-session preferences and game worlds.'}</p>
          <em>{ru ? 'Открыть каталог ↗' : 'Open catalog ↗'}</em>
        </a>
      </div>
      <aside className="play-select-referral">
        <p className="play-select-referral-eyebrow">OSGARD PLAY / FRIEND INVITE</p>
        <h4>{ru ? 'Твой следующий раунд — с другом.' : 'Your next round is better with a friend.'}</h4>
        <p>{ru ? 'Поделись каталогом с другом. Публикацию нельзя проверить автоматически, поэтому главная не начисляет очки за клик или самоподтверждение. Для SHARDS открой конкретную игру и добровольно включи программу приглашений.' : 'Share the catalogue with a friend. Posts cannot be verified automatically, so the homepage does not award points for a click or self-confirmation. To earn SHARDS, open a specific game and opt into its invite programme.'}</p>
        <button type="button" className="play-select-share-primary" onClick={shareInvite}>{ru ? 'Поделиться каталогом ↗' : 'Share the catalogue ↗'}</button>
        <div className="play-select-share-networks">
          {social.map(item => <a href={item.href} key={item.name} target="_blank" rel="noopener noreferrer" onClick={() => {
            setStatus(ru ? 'Открыл форму ' + item.name + '. Факт публикации не отслеживается; для SHARDS используй приглашение внутри игры.' : 'Opened the ' + item.name + ' composer. Publication is not tracked; use the in-game invite flow for SHARDS.')
          }}>{item.name} ↗</a>)}
        </div>
        <p className="play-select-status" role="status" aria-live="polite">{status}</p>
        <small>{ru ? 'SHARDS — пилотные очки без денежной стоимости, не обмениваются на покупки. Награда возможна только после серверной проверки приглашённой игровой сессии от 60 секунд и отдельных согласий; клик по соцсети или копирование ссылки не считаются публикацией.' : 'SHARDS are pilot points with no cash value and cannot be redeemed for purchases. A reward requires server verification of a referred game session of at least 60 seconds and separate consent; a social click or copied link is not a verified post.'}</small>
      </aside>
    </div>
  </section>
}
