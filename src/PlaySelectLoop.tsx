import { useEffect, useState } from 'react'

type Locale = 'ru' | 'en'
type Wallet = { balance: number; day: string }
const WALLET_KEY = 'osgard.games.shards-wallet.v1'

const services = [
  { id: 'marcosa', name: 'MARCOSA', category: 'SOCIAL / COMMUNITY', ru: 'Социальная сеть, сообщества и цифровые миры.', en: 'Social networking, communities and digital worlds.', url: 'https://marcosa.club/' },
  { id: 'projects', name: 'OSGARD PROJECTS', category: 'DIGITAL STUDIO', ru: 'Сайты, приложения и цифровые продукты.', en: 'Websites, apps and digital products.', url: 'https://osgardbewworld.com/' },
  { id: 'o2-system', name: 'O2 SYSTEM', category: 'BUSINESS OPERATIONS', ru: 'Инструменты учёта для обменных пунктов.', en: 'Accounting tools for exchange offices.', url: 'https://o2system.art/' },
  { id: 'senjorio', name: 'SENJORIO', category: 'PREMIUM MOBILITY', ru: 'Премиальный сервис такси.', en: 'Premium mobility and taxi service.', url: 'https://senjorio.com/' },
  { id: 'superday', name: 'SUPERDAY', category: 'MAP / DAILY PLANNING', ru: 'Умная карта и планировщик дня.', en: 'Smart map and day planner.', url: 'https://superday.run/' },
  { id: 'myosa', name: 'MYOSA', category: 'AI PLATFORM', ru: 'Инструменты на базе искусственного интеллекта.', en: 'An AI-powered product platform.', url: 'https://myosa.world/' },
] as const

function readWallet(): Wallet {
  if (typeof window === 'undefined') return { balance: 0, day: '' }
  try {
    const value = JSON.parse(window.localStorage.getItem(WALLET_KEY) || '{}')
    return {
      balance: Number.isSafeInteger(value.balance) && value.balance >= 0 ? Math.min(value.balance, 1000000000) : 0,
      day: typeof value.lastRewardDay === 'string' ? value.lastRewardDay : '',
    }
  } catch {
    return { balance: 0, day: '' }
  }
}

function makeInviteUrl(): string {
  const bytes = new Uint8Array(4)
  try {
    window.crypto.getRandomValues(bytes)
  } catch {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  const url = new URL('/games/invite/signal-run/', window.location.origin)
  url.searchParams.set('og_ref', 'og_' + Array.from(bytes, value => value.toString(16).padStart(2, '0')).join(''))
  url.searchParams.set('og_game', 'signal-run')
  url.searchParams.set('utm_source', 'osgard_world')
  url.searchParams.set('utm_medium', 'entertainment_referral')
  url.searchParams.set('utm_campaign', 'play_with_friends')
  url.searchParams.set('utm_content', 'home_entertainment')
  return url.href
}

export function PlaySelectLoop({ locale }: { locale: Locale }) {
  const ru = locale === 'ru'
  const [inviteUrl] = useState(makeInviteUrl)
  const [balance, setBalance] = useState(() => readWallet().balance)
  const [status, setStatus] = useState('')
  const [pendingNetwork, setPendingNetwork] = useState('')
  const message = ru ? 'Пойдём сыграем в OSGARD PLAY. Выбирай свой мир:' : 'Let’s play OSGARD PLAY. Choose your world:'

  useEffect(() => {
    const refresh = () => setBalance(readWallet().balance)
    window.addEventListener('storage', refresh)
    window.addEventListener('osgard:shards-updated', refresh)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('osgard:shards-updated', refresh)
    }
  }, [])

  const social = [
    { name: 'Telegram', href: 'https://t.me/share/url?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'WhatsApp', href: 'https://wa.me/?text=' + encodeURIComponent(message + ' ' + inviteUrl) },
    { name: 'VK', href: 'https://vk.com/share.php?url=' + encodeURIComponent(inviteUrl) + '&title=' + encodeURIComponent('OSGARD PLAY') },
    { name: 'X', href: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(inviteUrl) + '&text=' + encodeURIComponent(message) },
    { name: 'Facebook', href: 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(inviteUrl) },
  ]

  const grantReward = (source: string) => {
    const current = readWallet()
    const today = new Date().toISOString().slice(0, 10)
    if (current.day === today) {
      setBalance(current.balance)
      setStatus(ru ? 'Сегодня награда уже получена. Баланс: ' + current.balance + ' SHARDS.' : 'Today’s reward is already claimed. Balance: ' + current.balance + ' SHARDS.')
      setPendingNetwork('')
      return
    }
    const next = {
      balance: Math.min(1000000000, current.balance + 50),
      lastRewardDay: today,
      lastSource: source.slice(0, 60),
      updatedAt: new Date().toISOString(),
    }
    try {
      window.localStorage.setItem(WALLET_KEY, JSON.stringify(next))
      setBalance(next.balance)
      window.dispatchEvent(new CustomEvent('osgard:shards-updated', { detail: { balance: next.balance } }))
      setStatus(ru ? '+50 SHARDS добавлено. Баланс: ' + next.balance + '. Награда локальная и не имеет денежной стоимости.' : '+50 SHARDS added. Balance: ' + next.balance + '. Local points have no cash value.')
    } catch {
      setStatus(ru ? 'Браузер не разрешил сохранить награду на этом устройстве.' : 'The browser could not save the reward on this device.')
    }
    setPendingNetwork('')
  }

  const shareInvite = async () => {
    setPendingNetwork('')
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'OSGARD PLAY', text: message, url: inviteUrl })
        setPendingNetwork('native-share')
        setStatus(ru
          ? 'Меню отправки закрыто. Если ты действительно опубликовал приглашение, подтверди ниже. Автоматически проверить публикацию невозможно.'
          : 'The share sheet closed. If you actually published the invite, confirm below. The post itself cannot be verified automatically.')
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(message + ' ' + inviteUrl)
        setStatus(ru
          ? 'Ссылка скопирована. Копирование само по себе не считается репостом и не даёт награду. Опубликуй её через соцсеть ниже, затем вернись и подтверди.'
          : 'Link copied. Copying alone is not a repost and earns no reward. Publish it through a social network below, then return and confirm.')
      } else {
        setStatus(ru ? 'Быстрая отправка недоступна. Выбери соцсеть ниже.' : 'Quick share is unavailable. Choose a network below.')
      }
    } catch (error) {
      setPendingNetwork('')
      setStatus(error instanceof Error && error.name === 'AbortError'
        ? (ru ? 'Отправка отменена — награда не начислена.' : 'Share cancelled — no reward was granted.')
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
        <p>{ru ? 'Поделись приглашением. +50 SHARDS доступны после явного подтверждения публикации — не чаще раза в UTC-день на этом устройстве. Копирование ссылки само по себе не награждается.' : 'Share an invite. +50 SHARDS can be claimed after you explicitly confirm publishing the invite, once per UTC day on this device. Copying a link alone earns no reward.'}</p>
        <div className="play-select-wallet"><span>OSGARD SHARDS</span><strong>{balance.toLocaleString(ru ? 'ru-RU' : 'en-US')}</strong></div>
        <button type="button" className="play-select-share-primary" onClick={shareInvite}>{ru ? 'Поделиться приглашением ↗' : 'Share invitation ↗'}</button>
        <div className="play-select-share-networks">
          {social.map(item => <a href={item.href} key={item.name} target="_blank" rel="noopener noreferrer" onClick={() => {
            setPendingNetwork(item.name)
            setStatus(ru ? 'Открой публикацию в ' + item.name + ', затем вернись и подтверди действие.' : 'Open the ' + item.name + ' composer, then return and confirm the action.')
          }}>{item.name} ↗</a>)}
        </div>
        {pendingNetwork && <button type="button" className="play-select-share-claim" onClick={() => grantReward('homepage-social-confirmation:' + pendingNetwork)}>
          {ru ? 'Я отправил в ' + pendingNetwork + ' — получить +50 SHARDS' : 'I shared on ' + pendingNetwork + ' — claim +50 SHARDS'}
        </button>}
        <p className="play-select-status" role="status" aria-live="polite">{status}</p>
        <small>{ru ? 'SHARDS хранятся локально, не являются деньгами и не обмениваются на денежную стоимость. Соцсети не подтверждают публикацию сайту; отправку по кнопке соцсети пользователь подтверждает сам.' : 'SHARDS are local points, not money and not redeemable. Social networks do not verify posts to this site; social-compose sharing uses player confirmation.'}</small>
      </aside>
    </div>
  </section>
}
