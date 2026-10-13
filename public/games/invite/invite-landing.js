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
  const analyticsKey='osgard.games.analytics-consent.v1',rewardConsentKey='osgard.games.referral-reward-consent.v1',attributionKey='osgard.games.referral-attribution.v1';
  const marker='osgard.games.referral-opened.'+code,serverRewardInvite=/^og_[a-f0-9]{32}$/.test(code);
  const hasAnalytics=()=>{try{return localStorage.getItem(analyticsKey)==='yes'}catch{return false}},hasRewardConsent=()=>{try{return localStorage.getItem(rewardConsentKey)==='yes'}catch{return false}};
  function randomHex(bytes=12){try{if(!globalThis.crypto?.getRandomValues)return '';const data=new Uint8Array(bytes);crypto.getRandomValues(data);return Array.from(data,v=>v.toString(16).padStart(2,'0')).join('')}catch{return ''}}
  function visitorToken(){try{let v=localStorage.getItem('osgard.games.referral-owner-token.v1')||'';if(/^[a-f0-9]{12}$/.test(v))return v;v=randomHex(6);if(!v)return '';localStorage.setItem('osgard.games.referral-owner-token.v1',v);return v}catch{return ''}}
  async function recordInviteOpen(){
   if(!hasAnalytics()||(serverRewardInvite&&!hasRewardConsent()))return false;
   const token=serverRewardInvite?visitorToken():'';
   if(serverRewardInvite&&!token)return false;
   try{sessionStorage.setItem(attributionKey,JSON.stringify({code,game:requestedGame,visitorToken:token,at:Date.now()}));const state=sessionStorage.getItem(marker)||'';if(state==='yes')return true;if(state==='pending')return false;sessionStorage.setItem(marker,'pending')}catch{return false}
   const event={eventId:'evt_'+randomHex(16),name:'referral_link_opened',sessionId:'session_'+randomHex(12),gameId:validGameIds.has(requestedGame)?requestedGame:'unknown',source:serverRewardInvite?'referral-link:'+code+':'+requestedGame+':'+token:'referral-link:'+code,path:location.pathname,durationSeconds:0};
   try{const cfg=await fetch('/games/commerce-config.json',{cache:'no-store'}),config=cfg.ok?await cfg.json().catch(()=>({})):({});const base=String(config.apiBaseUrl||'/commerce-api').replace(/\/+$/,'');const response=await fetch(base+'/v1/events',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({consent:true,events:[event]})});if(response.ok){sessionStorage.setItem(marker,'yes');return true}sessionStorage.removeItem(marker);return false}catch{try{sessionStorage.removeItem(marker)}catch{}return false}
  }
  if(serverRewardInvite&&play){
   if(hasAnalytics()&&hasRewardConsent()){void recordInviteOpen();return}
   const panel=document.createElement('section');panel.id='osgard-referral-consent';panel.setAttribute('aria-labelledby','osgard-referral-consent-title');
   const style=document.createElement('style');style.textContent='#osgard-referral-consent{margin:20px 0;padding:20px;border:1px solid #bda46a66;background:linear-gradient(140deg,#c5a95e16,transparent 64%),#0e1115;color:#f2f0e8;font:13px/1.6 system-ui,sans-serif}#osgard-referral-consent h2{margin:0 0 8px;font:400 25px/1.1 Georgia,serif}#osgard-referral-consent p{color:#a7adba;font-size:12px}#osgard-referral-consent label{display:flex;align-items:flex-start;gap:9px;margin:10px 0;color:#d8deea;font-size:12px}#osgard-referral-consent input{margin-top:4px;accent-color:#d8c28f}#osgard-referral-consent .actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}#osgard-referral-consent button{min-height:42px;padding:10px 13px;border:1px solid #bda46a66;background:transparent;color:#f2f0e8;cursor:pointer}#osgard-referral-consent .primary{background:#d8c28f;color:#13130f;border-color:#d8c28f}#osgard-referral-consent button:focus-visible{outline:2px solid #f2f0e8;outline-offset:3px}@media(prefers-reduced-motion:reduce){#osgard-referral-consent *{animation:none!important;transition:none!important}}';document.head.append(style);
   const h=document.createElement('h2');h.id='osgard-referral-consent-title';h.textContent='Играть вместе — с прозрачной наградой';
   const p=document.createElement('p');p.textContent='Участие необязательно. Если согласишься, OSGARD сохранит псевдонимный идентификатор браузера и учтёт открытие ссылки и игровую сессию, чтобы начислить пригласившему +50 SHARDS после сессии той же игры не короче 60 секунд. Социальные публикации не отслеживаются; SHARDS не имеют денежной стоимости.';
   const al=document.createElement('label'),a=document.createElement('input');a.type='checkbox';a.checked=hasAnalytics();const at=document.createElement('span');at.textContent='Разрешаю необязательную продуктовую аналитику для учёта этой сессии.';al.append(a,at);
   const rl=document.createElement('label'),r=document.createElement('input');r.type='checkbox';r.checked=hasRewardConsent();const rt=document.createElement('span');rt.textContent='Отдельно соглашаюсь на программу приглашений и обработку псевдонимных событий для SHARDS.';rl.append(r,rt);
   const actions=document.createElement('div');actions.className='actions';const allow=document.createElement('button');allow.type='button';allow.className='primary';allow.textContent='Разрешить учёт и продолжить';const skip=document.createElement('button');skip.type='button';skip.textContent='Продолжить без отслеживания';
   const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');const sync=()=>{allow.disabled=!(a.checked&&r.checked)};a.addEventListener('change',sync);r.addEventListener('change',sync);sync();
   allow.addEventListener('click',async()=>{if(!(a.checked&&r.checked))return;try{localStorage.setItem(analyticsKey,'yes');localStorage.setItem(rewardConsentKey,'yes')}catch{}allow.disabled=true;status.textContent='Регистрируем приглашение…';const ok=await recordInviteOpen();status.textContent=ok?'Готово. Можешь продолжить игру; награда зависит от длительности сессии, а не от репоста.':'Согласие сохранено, но сервер не принял событие. Играть можно, однако награда может не засчитаться.';const next=new URL(play.href,location.origin);next.searchParams.set('osgard_consent','yes');play.href=next.href});
   skip.addEventListener('click',()=>{try{localStorage.removeItem(rewardConsentKey)}catch{}const next=new URL(play.href,location.origin);for(const k of ['og_ref','utm_source','utm_medium','utm_campaign','utm_content'])next.searchParams.delete(k);play.href=next.href;panel.remove()});
   panel.append(h,p,al,rl,actions,status);actions.append(allow,skip);(play.parentElement?.parentElement||document.querySelector('main')||document.body).append(panel);
   play.addEventListener('click',event=>{if(!(a.checked&&r.checked)&&panel.isConnected){event.preventDefault();panel.scrollIntoView({behavior:'smooth',block:'center'});status.textContent='Выбери участие или продолжи без отслеживания.'}});
   return;
  }
  if(!hasAnalytics())return;void recordInviteOpen();

})();
