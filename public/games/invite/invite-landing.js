(() => {
  'use strict';
  const game = document.body.dataset.game || '';
  const validGameIds = new Set(['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run']);
  const params = new URLSearchParams(location.search);
  const code = params.get('og_ref') || '';
  const requestedGame = params.get('og_game') || '';
  const source = params.get('utm_source') || '';
  const medium = params.get('utm_medium') || '';
  const campaign = params.get('utm_campaign') || '';
  const content = params.get('utm_content') || '';
  const sameGame = game ? requestedGame === game : requestedGame === '';
  const valid = /^og_(?:[a-f0-9]{8}|[a-f0-9]{32})$/.test(code) &&
    sameGame &&
    (!requestedGame || validGameIds.has(requestedGame)) &&
    source === 'osgard_play' &&
    medium === 'referral' &&
    campaign === 'play_with_friends' &&
    content === (requestedGame || 'catalog');
  const scoreValue = Number(params.get('challenge') || 0);
  const requestedDay = params.get('day') || '';
  const validDay = /^\d{4}-\d{2}-\d{2}$/.test(requestedDay) &&
    (() => { const date = new Date(requestedDay + 'T00:00:00.000Z'); return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === requestedDay; })();
  const requestedMode = params.get('mode') || '';
  const validDailyMode = requestedMode === 'daily' && validDay;
  const validOrdinaryMode = requestedMode === '' && requestedDay === '';
  const legacySignalRun = game === 'signal-run' &&
    params.get('play') === 'signal-run' &&
    Number.isSafeInteger(scoreValue) && scoreValue > 0 && scoreValue <= 1000000000 &&
    /^[a-f0-9]{12}$/.test(params.get('ref') || '') &&
    source === 'signal-run' &&
    medium === 'share' &&
    campaign === 'challenge' &&
    (validDailyMode || validOrdinaryMode);
  const play = document.querySelector('#play-link');
  if (play) {
    const target = new URL('/games/', location.origin);
    if (game && validGameIds.has(game)) target.searchParams.set('og_game', game);
    if (valid) {
      target.searchParams.set('og_ref', code);
      if (requestedGame) target.searchParams.set('og_game', requestedGame);
      target.searchParams.set('utm_source', source);
      target.searchParams.set('utm_medium', medium);
      target.searchParams.set('utm_campaign', campaign);
      target.searchParams.set('utm_content', content);
    }
    else if (legacySignalRun) {
      // Keep only the validated SIGNAL RUN challenge contract when leaving the social preview.
      // This is a legacy score challenge, not a canonical anonymous invite-open event.
      for (const key of ['play', 'challenge', 'ref', 'utm_source', 'utm_medium', 'utm_campaign']) {
        const value = params.get(key);
        if (value !== null) target.searchParams.set(key, value);
      }
      if (validDailyMode) {
        target.searchParams.set('mode', 'daily');
        target.searchParams.set('day', requestedDay);
      }
    }
    play.href = target.href;
  }
  if (!valid) return;
  const rewardableInvite = /^og_[a-f0-9]{32}$/.test(code);
  if (rewardableInvite) {
    const analyticsKey = 'osgard.games.analytics-consent.v1';
    const rewardConsentKey = 'osgard.games.referral-reward-consent.v1';
    const visitorTokenKey = 'osgard.games.referral-owner-token.v1';
    const attributionKey = 'osgard.games.referral-attribution.v1';
    const marker = 'osgard.games.referral-opened.' + code;
    const section = play.closest('section') || document.querySelector('main');
    if (section && !document.querySelector('#osgard-invite-reward-consent')) {
      const style = document.createElement('style');
      style.textContent = '.invite-reward-consent{margin:18px 0 0;padding:16px;border:1px solid #d7bb764a;background:linear-gradient(135deg,#d7bb760d,#ffffff03);color:#d8d4c6;font:12px/1.7 system-ui,sans-serif}.invite-reward-consent h2{margin:0 0 7px;color:#f0d99c;font:400 25px/1.1 Georgia,serif}.invite-reward-consent p{margin:7px 0;color:#aaa998}.invite-reward-consent label{display:flex;align-items:flex-start;gap:9px;margin:10px 0;cursor:pointer}.invite-reward-consent input{flex:0 0 auto;width:16px;height:16px;margin-top:3px;accent-color:#d7bb76}.invite-reward-consent button{min-height:40px;margin-top:7px;padding:9px 13px;border:1px solid #d7bb76;background:linear-gradient(115deg,#c5a95e,#e8d5a1 60%,#c9ab64);color:#13130f;font-weight:650;cursor:pointer}.invite-reward-consent button:focus-visible,.invite-reward-consent input:focus-visible{outline:2px solid #f2e4bb;outline-offset:3px}.invite-reward-consent [role=status]{min-height:1em;color:#ead59d}.invite-reward-consent small{display:block;color:#858575;font-size:10px;line-height:1.65}@media(prefers-reduced-motion:reduce){.invite-reward-consent *{scroll-behavior:auto;transition:none;animation:none}}';
      document.head.append(style);
      const panel = document.createElement('aside');
      panel.className = 'invite-reward-consent';
      panel.id = 'osgard-invite-reward-consent';
      panel.setAttribute('aria-labelledby','invite-reward-title');
      const heading = document.createElement('h2');
      heading.id = 'invite-reward-title';
      heading.textContent = 'Приглашение с бонусом';
      const copy = document.createElement('p');
      copy.textContent = 'Можно участвовать добровольно. +50 SHARDS начисляются пригласившему только если сервер зарегистрирует приглашение и подтвердит твою игровую сессию в той же игре не короче 60 секунд.';
      const analyticsLabel = document.createElement('label');
      const analytics = document.createElement('input');
      analytics.type = 'checkbox';
      const analyticsText = document.createElement('span');
      analyticsText.textContent = 'Разрешаю необязательную аналитику игровых событий.';
      analyticsLabel.append(analytics,analyticsText);
      const rewardLabel = document.createElement('label');
      const reward = document.createElement('input');
      reward.type = 'checkbox';
      const rewardText = document.createElement('span');
      rewardText.textContent = 'Отдельно соглашаюсь на учёт приглашения и бонусную программу SHARDS.';
      rewardLabel.append(reward,rewardText);
      const details = document.createElement('small');
      details.textContent = 'Сохраняется случайный токен браузера, код приглашения и события сессии. SHARDS — внутриигровые очки без денежной стоимости, не деньги и не средство оплаты. Играть можно без согласия.';
      const save = document.createElement('button');
      save.type = 'button';
      save.textContent = 'Сохранить выбор';
      const status = document.createElement('p');
      status.setAttribute('role','status');
      status.setAttribute('aria-live','polite');
      panel.append(heading,copy,analyticsLabel,rewardLabel,details,save,status);
      section.append(panel);
      try {
        analytics.checked = localStorage.getItem(analyticsKey) === 'yes';
        reward.checked = localStorage.getItem(rewardConsentKey) === 'yes';
      } catch {}
      const randomHex = (bytes = 12) => {
        if (!globalThis.crypto || typeof globalThis.crypto.getRandomValues !== 'function') return '';
        try {
          const data = new Uint8Array(bytes);
          globalThis.crypto.getRandomValues(data);
          return Array.from(data,value=>value.toString(16).padStart(2,'0')).join('');
        } catch { return ''; }
      };
      save.addEventListener('click', async () => {
        try {
          if (analytics.checked) localStorage.setItem(analyticsKey,'yes');
          else localStorage.removeItem(analyticsKey);
          if (reward.checked) localStorage.setItem(rewardConsentKey,'yes');
          else localStorage.removeItem(rewardConsentKey);
        } catch {
          status.textContent = 'Не удалось сохранить выбор в этом браузере. Игру всё равно можно открыть.';
          return;
        }
        if (!analytics.checked || !reward.checked) {
          status.textContent = 'Бонусное участие выключено. Играть и делиться ссылкой можно без отслеживания.';
          return;
        }
        const visitorToken = (() => {
          try {
            let value = localStorage.getItem(visitorTokenKey) || '';
            if (/^[a-f0-9]{12}$/.test(value)) return value;
            value = randomHex(6);
            if (!value) return '';
            localStorage.setItem(visitorTokenKey,value);
            return value;
          } catch { return ''; }
        })();
        if (!visitorToken) {
          status.textContent = 'Безопасный токен браузера недоступен; приглашение откроется, но бонус не будет учитываться.';
          return;
        }
        try {
          sessionStorage.setItem(attributionKey,JSON.stringify({code,game:requestedGame,visitorToken,at:Date.now()}));
          const state = sessionStorage.getItem(marker) || '';
          if (state === 'yes') {
            status.textContent = 'Приглашение уже зарегистрировано в этой вкладке.';
            return;
          }
          if (state === 'pending') {
            status.textContent = 'Регистрация приглашения уже выполняется.';
            return;
          }
          sessionStorage.setItem(marker,'pending');
        } catch {
          status.textContent = 'Не удалось сохранить атрибуцию. Игру можно открыть без бонусного учёта.';
          return;
        }
        const event = {
          eventId:'evt_'+randomHex(12),
          name:'referral_link_opened',
          sessionId:'session_'+randomHex(12),
          gameId:requestedGame,
          source:'referral-link:'+code+':'+requestedGame+':'+visitorToken,
          path:location.pathname,
          durationSeconds:0
        };
        let base = '';
        try {
          const configResponse = await fetch('/games/commerce-config.json',{cache:'no-store'});
          const config = configResponse.ok ? await configResponse.json().catch(()=>({})) : {};
          base = typeof config.apiBaseUrl === 'string' ? config.apiBaseUrl.trim() : '';
          if (!base) {
            const ready = await fetch('/commerce-api/readyz',{cache:'no-store'});
            if (ready.ok) base = '/commerce-api';
          }
          const parsed = base ? new URL(base,location.origin) : null;
          if (!parsed) throw new Error('Referral API unavailable');
          const localApi = ['localhost','127.0.0.1'].includes(parsed.hostname);
          const allowedPath = parsed.pathname === '/' || (parsed.origin === location.origin && parsed.pathname === '/commerce-api');
          if ((parsed.protocol !== 'https:' && !(localApi && parsed.protocol === 'http:')) || parsed.username || parsed.password || !allowedPath || parsed.search || parsed.hash) throw new Error('Referral API origin rejected');
          base = parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
          const response = await fetch(base+'/v1/events',{
            method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({consent:true,events:[event]})
          });
          if (!response.ok) throw new Error('Referral event not accepted');
          sessionStorage.setItem(marker,'yes');
          status.textContent = 'Согласия сохранены, приглашение зарегистрировано. Теперь открой игру по кнопке выше.';
        } catch {
          try { sessionStorage.removeItem(marker); } catch {}
          status.textContent = 'Согласия сохранены, но сервер приглашений пока недоступен. Игру можно запустить; серверные SHARDS не начисляются.';
        }
      });
    }
    return;
  }
  let consent = false;
  try { consent = localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'; } catch {}
  if (!consent) return;
  const attributionKey = 'osgard.games.referral-attribution.v1';
  const marker = 'osgard.games.referral-opened.' + code;
  function randomHex(bytes = 12) {
    const data = new Uint8Array(bytes);
    if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(data);
    else for (let i = 0; i < data.length; i++) data[i] = Math.floor(Math.random() * 256);
    return Array.from(data, value => value.toString(16).padStart(2, '0')).join('');
  }
  let state = '';
  try {
    sessionStorage.setItem(attributionKey, JSON.stringify({ code, game: requestedGame, at: Date.now() }));
    state = sessionStorage.getItem(marker) || '';
    if (state === 'yes' || state === 'pending') return;
    sessionStorage.setItem(marker, 'pending');
  } catch { return; }
  const event = {
    eventId: 'evt_' + randomHex(),
    name: 'referral_link_opened',
    sessionId: 'session_' + randomHex(),
    gameId: validGameIds.has(requestedGame) ? requestedGame : 'unknown',
    source: 'referral-link:' + code,
    path: location.pathname,
    durationSeconds: 0,
  };
  (async () => {
    try {
      const configResponse = await fetch('/games/commerce-config.json', { cache: 'no-store' });
      const config = configResponse.ok ? await configResponse.json().catch(() => ({})) : {};
      const base = String(config.apiBaseUrl || '/commerce-api').replace(/\/+$/, '');
      const response = await fetch(base + '/v1/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: true, events: [event] }),
      });
      if (response.ok) sessionStorage.setItem(marker, 'yes');
      else sessionStorage.removeItem(marker);
    } catch {
      try { sessionStorage.removeItem(marker); } catch {}
    }
  })();
})();
