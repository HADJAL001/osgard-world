(() => {
  'use strict';
  const game = 'civic-cascade';
  const version = '1.6.0';
  const status = document.querySelector('#systemStatus');
  const canvas = document.querySelector('#cityCanvas');
  const start = document.querySelector('#startBtn');
  if (!status || !canvas || !start || window.__OSGARD_CIVIC_BRIDGE__) return;
  window.__OSGARD_CIVIC_BRIDGE__ = true;
  const embedded = window.parent !== window;
  let previous = '';
  let failed = false;
  function post(state, extra = {}) {
    if (!embedded) return;
    try {
      window.parent.postMessage({
        type: 'osgard:game-lifecycle',
        game,
        state,
        version,
        at: Date.now(),
        ...extra
      }, window.location.origin);
    } catch {}
  }
  function sync() {
    const text = (status.textContent || '').trim();
    let next = '';
    if (text === 'СИСТЕМА ГОТОВА') next = 'ready';
    else if (text === 'СИМУЛЯЦИЯ В РЕАЛЬНОМ ВРЕМЕНИ') next = 'started';
    else if (text === 'СИМУЛЯЦИЯ НА ПАУЗЕ') next = 'paused';
    else if (text === 'ОПЕРАЦИЯ ЗАВЕРШЕНА') next = 'completed';
    if (!next || next === previous) return;
    const prior = previous;
    previous = next;
    if (next === 'started' && prior === 'paused') post('resumed');
    else if (next === 'started') post('started');
    else if (next === 'ready') post('ready');
    else if (next === 'paused') post('paused');
    else if (next === 'completed') post('completed', { reason: 'mission-finished' });
  }
  new MutationObserver(sync).observe(status, { childList: true, subtree: true, characterData: true });
  new MutationObserver(sync).observe(start, { childList: true, subtree: true, characterData: true, attributes: true });
  window.addEventListener('error', event => {
    if (failed) return;
    failed = true;
    post('error', { message: String(event.message || 'Runtime error').slice(0, 180) });
  });
  sync();
})();