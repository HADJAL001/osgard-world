(() => {
  'use strict'
  const $ = (selector, root = document) => root.querySelector(selector)
  const grid = $('#games-grid')
  const filters = $('.filters')
  const search = $('#game-search')
  if (!grid || !filters || !search) return

  const RECENT_KEY = 'osgard.games.recent.v1'
  const validIds = new Set(['null-shift', 'time', 'swarm', 'inherit', 'remix', 'patina'])
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
  share.innerHTML = '<span aria-hidden="true">↗</span> Поделиться платформой'
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

  share.addEventListener('click', async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: 'OSGARD PLAY', text: 'Игровые миры OSGARD', url: location.href })
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(location.href)
      } else {
        throw new Error('Share unavailable')
      }
      announce('Ссылка на OSGARD PLAY готова к отправке.')
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        announce('Отправка ссылки отменена.')
        return
      }
      announce('Не удалось поделиться ссылкой. Скопируй адрес из строки браузера.')
    }
  })

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
