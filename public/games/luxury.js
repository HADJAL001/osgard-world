(() => {
  'use strict'
  const $ = (selector, root = document) => root.querySelector(selector)
  const grid = $('#games-grid')
  const filters = $('.filters')
  const search = $('#game-search')
  if (!grid || !filters || !search) return

  const RECENT_KEY = 'osgard.games.recent.v1'
  const INVITE_KEY = 'osgard.games.invite-code.v1'
  const INVITE_EVENT_KEY = 'osgard.games.invite-event.v1'
  const validInvite = value => /^OSG-[A-Z0-9]{8}$/.test(String(value || ''))
  const validIds = new Set(['null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade', 'patina', 'signal-run', 'cascade-lab'])
  const originalOrder = new Map(Array.from(grid.querySelectorAll('.card'), (card, index) => [card.dataset.game, index]))

  function getRecent() {
    try {
      const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]')
      return Array.isArray(parsed) ? parsed.filter(id => validIds.has(id)) : []
    } catch {
      return []
    }
  }

  const tools = document.createElement('div')
  tools.className = 'luxury-tools'
  tools.setAttribute('aria-label', 'Быстрые инструменты каталога')

  const sortLabel = document.createElement('label')
  sortLabel.className = 'luxury-sort'
  sortLabel.innerHTML = '<span>Сортировка</span>'
  const sort = document.createElement('select')
  sort.setAttribute('aria-label', 'Сортировка игр')
  sort.innerHTML = '<option value="curated">Подборка OSGARD</option><option value="title">По алфавиту</option><option value="recent">Недавно открытые</option>'
  sortLabel.append(sort)

  const random = document.createElement('button')
  random.type = 'button'
  random.className = 'luxury-action'
  random.innerHTML = '<span aria-hidden="true">✧</span> Случайная игра <span aria-hidden="true">↗</span>'
  random.setAttribute('aria-label', 'Выбрать случайную игру из текущего фильтра')

  const resume = document.createElement('button')
  resume.type = 'button'
  resume.className = 'luxury-action'
  resume.innerHTML = '<span aria-hidden="true">▷</span> Продолжить последнюю'
  resume.setAttribute('aria-label', 'Открыть последнюю выбранную игру')

  const share = document.createElement('button')
  share.type = 'button'
  share.className = 'luxury-action'
  share.innerHTML = '<span aria-hidden="true">↗</span> Пригласить друга'
  share.setAttribute('aria-label', 'Поделиться ссылкой на OSGARD PLAY')

  const status = document.createElement('p')
  status.className = 'luxury-status'
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')

  const shortcuts = document.createElement('p')
  shortcuts.className = 'luxury-shortcuts'
  shortcuts.textContent = 'Клавиши: / — поиск · R — случайная игра · F — избранное · Esc — очистить поиск'

  tools.append(sortLabel, random, resume, share, status, shortcuts)
  filters.append(tools)

  function visibleCards() {
    return Array.from(grid.querySelectorAll('.card')).filter(card => !card.hidden && card.querySelector('a[data-play]'))
  }

  function createInviteCode() {
    let code = ''
    try { code = localStorage.getItem(INVITE_KEY) || '' } catch {}
    if (validInvite(code)) return code
    let token = ''
    try {
      const bytes = new Uint8Array(5)
      if (window.crypto && typeof window.crypto.getRandomValues === 'function') {
        window.crypto.getRandomValues(bytes)
        token = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('').slice(0, 8).toUpperCase()
      }
    } catch {}
    if (!/^[A-Z0-9]{8}$/.test(token)) token = Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, '0')
    code = 'OSG-' + token
    try { localStorage.setItem(INVITE_KEY, code) } catch {}
    return code
  }

  function inviteUrl() {
    const url = new URL('/games/', location.origin)
    url.searchParams.set('ref', createInviteCode())
    url.searchParams.set('utm_source', 'player_invite')
    url.searchParams.set('utm_medium', 'share')
    url.searchParams.set('utm_campaign', 'osgard_play_growth')
    return url.toString()
  }

  async function reportInviteEvent(name, code, source) {
    let consent = false
    try { consent = localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes' } catch {}
    if (!consent || !validInvite(code)) return
    const dedupeKey = INVITE_EVENT_KEY + ':' + name + ':' + code
    try {
      if (sessionStorage.getItem(dedupeKey)) return
      sessionStorage.setItem(dedupeKey, 'yes')
    } catch {}
    let sessionId = ''
    try {
      sessionId = sessionStorage.getItem('osgard.games.referral-session.v1') || ''
      if (!sessionId) {
        sessionId = 'session_' + (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12))
        sessionStorage.setItem('osgard.games.referral-session.v1', sessionId)
      }
    } catch {
      sessionId = 'session_' + Date.now().toString(36)
    }
    const config = fetch('/games/commerce-config.json', { cache: 'no-store', credentials: 'same-origin' })
      .then(response => response.ok ? response.json() : {})
      .catch(() => ({}))
    const settings = await config
    let base = String(settings.apiBaseUrl || '/commerce-api')
    while (base.endsWith('/')) base = base.slice(0, -1)
    try {
      await fetch(base + '/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent: true,
          events: [{ name, sessionId, gameId: 'unknown', source: (source + ':' + code).slice(0, 80), path: location.pathname, durationSeconds: 0 }],
        }),
        keepalive: true,
      })
    } catch {
      // Sharing and opening games must work even when analytics is unavailable.
    }
  }

  async function shareInvite() {
    const code = createInviteCode()
    const url = inviteUrl()
    try {
      if (navigator.share) {
        await navigator.share({ title: 'OSGARD PLAY', text: 'Выбери игровой мир OSGARD и попробуй сам.', url })
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        throw new Error('Share unavailable')
      }
      announce('Персональная ссылка готова. Отправь её другу.')
      const growthStatus = $('#growth-invite-status')
      if (growthStatus) growthStatus.textContent = 'Ссылка готова — отправь её другу.'
      void reportInviteEvent('referral_link_created', code, 'catalog-share')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        announce('Отправка ссылки отменена.')
        return
      }
      announce('Не удалось поделиться автоматически. Ссылка содержит код ' + code + '; проверь разрешения браузера.')
      const growthStatus = $('#growth-invite-status')
      if (growthStatus) growthStatus.textContent = 'Не удалось скопировать автоматически. Попробуй меню «Поделиться» в браузере.'
    }
  }

  function showInviteBanner() {
    let code = ''
    try { code = new URLSearchParams(location.search).get('ref') || '' } catch {}
    if (!validInvite(code)) return
    const hero = $('.hero')
    if (!hero || $('.growth-referral-banner')) return
    const banner = document.createElement('section')
    banner.className = 'growth-referral-banner'
    banner.setAttribute('aria-label', 'Приглашение в OSGARD PLAY')
    const left = document.createElement('div')
    const icon = document.createElement('span')
    icon.className = 'ref-icon'
    icon.textContent = 'O'
    const copy = document.createElement('div')
    const title = document.createElement('strong')
    title.textContent = 'Тебя пригласили в OSGARD PLAY'
    const description = document.createElement('p')
    description.textContent = 'Код приглашения ' + code + '. Выбери свой игровой мир и передай приглашение дальше.'
    copy.append(title, description)
    left.append(icon, copy)
    const link = document.createElement('a')
    link.href = '#catalog'
    link.textContent = 'Выбрать игру ↓'
    banner.append(left, link)
    hero.before(banner)
    void reportInviteEvent('referral_landing_opened', code, 'referral')
  }
  function announce(message) {
    status.textContent = message
  }

  function updateResumeButton() {
    const recent = getRecent()
    const id = recent.find(value => validIds.has(value) && grid.querySelector('.card[data-game="' + value + '"]'))
    resume.disabled = !id
    resume.title = id ? 'Последняя игра: ' + (grid.querySelector('.card[data-game="' + id + '"]')?.dataset.title || id) : 'Сначала открой любую игру'
  }

  function openCard(card) {
    if (!card) return false
    const link = card.querySelector('a[data-play]')
    if (!link) return false
    link.click()
    return true
  }

  function launchRandom() {
    const candidates = visibleCards()
    if (!candidates.length) {
      announce('По текущим фильтрам игр не найдено.')
      return
    }
    const card = candidates[Math.floor(Math.random() * candidates.length)]
    announce('Выбрана игра: ' + (card.dataset.title || card.dataset.game))
    openCard(card)
  }

  function sortCards(mode) {
    const recent = getRecent()
    const rank = new Map(recent.map((id, index) => [id, index]))
    const cards = Array.from(grid.querySelectorAll('.card'))
    cards.sort((a, b) => {
      if (mode === 'title') return (a.dataset.title || a.dataset.game || '').localeCompare(b.dataset.title || b.dataset.game || '', 'ru')
      if (mode === 'recent') {
        const ar = rank.has(a.dataset.game) ? rank.get(a.dataset.game) : 999
        const br = rank.has(b.dataset.game) ? rank.get(b.dataset.game) : 999
        if (ar !== br) return ar - br
      }
      return (originalOrder.get(a.dataset.game) ?? 999) - (originalOrder.get(b.dataset.game) ?? 999)
    })
    cards.forEach(card => grid.append(card))
    announce(mode === 'recent' ? 'Сначала недавно открытые игры.' : mode === 'title' ? 'Игры отсортированы по алфавиту.' : 'Восстановлена подборка OSGARD.')
  }

  sort.addEventListener('change', () => sortCards(sort.value))
  random.addEventListener('click', launchRandom)
  resume.addEventListener('click', () => {
    const id = getRecent().find(value => validIds.has(value))
    const card = id ? grid.querySelector('.card[data-game="' + id + '"]') : null
    if (!openCard(card)) announce('История игр пока пуста.')
  })

  share.addEventListener('click', () => { void shareInvite() })
  const growthInviteButton = $('#growth-invite-button')
  if (growthInviteButton) growthInviteButton.addEventListener('click', () => { void shareInvite() })

  document.querySelectorAll('[data-interest]').forEach(button => {
    button.addEventListener('click', () => {
      const requested = button.getAttribute('data-interest') || ''
      const select = document.querySelector('#project-form select[name="projectType"]')
      if (select instanceof HTMLSelectElement) {
        const option = Array.from(select.options).find(item => item.textContent.trim() === requested || item.value === requested)
        if (option) select.value = option.value
      }
      const contact = $('#contact')
      if (contact) contact.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    })
  })
  showInviteBanner()

  grid.addEventListener('click', () => {
    updateResumeButton()
    if (sort.value === 'recent') sortCards('recent')
  })
  updateResumeButton()

  document.addEventListener('keydown', event => {
    const target = event.target
    const typing = target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    if ((typing && !(event.key === 'Escape' && target === search)) || event.metaKey || event.ctrlKey || event.altKey || $('#player-dialog')?.open) return

    if (event.key === '/') {
      event.preventDefault()
      search.focus()
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      launchRandom()
    } else if (event.key.toLowerCase() === 'f') {
      const favorites = $('#favorites-filter')
      if (favorites) favorites.click()
    } else if (event.key === 'Escape' && document.activeElement === search) {
      search.value = ''
      search.dispatchEvent(new Event('input', { bubbles: true }))
      announce('Поиск очищен.')
    }
  })
})();
