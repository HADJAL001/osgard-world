(() => {
  'use strict';
  const GAME_IDS = Object.freeze(['null-shift','time','swarm','inherit','remix']);
  const NEXT = Object.freeze({
    'null-shift': Object.freeze(['swarm','time']),
    time: Object.freeze(['inherit','null-shift']),
    swarm: Object.freeze(['null-shift','remix']),
    inherit: Object.freeze(['time','swarm']),
    remix: Object.freeze(['swarm','null-shift'])
  });
  const PHASES = new Set(['await_first_start','first_started','await_second','await_second_start','second_started','completed','abandoned']);
  const isGame = value => typeof value === 'string' && GAME_IDS.includes(value);
  const coreGameDifferent = (value, expected) => isGame(value) && value !== expected;
  const isCode = value => typeof value === 'string' && /^[a-f0-9]{8}$/.test(value);
  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object' || raw.schemaVersion !== 1) return null;
    if (!isCode(raw.id) || !isGame(raw.firstGame) || !PHASES.has(raw.phase)) return null;
    const next = NEXT[raw.firstGame] || [];
    const secondGame = isGame(raw.secondGame) && next.includes(raw.secondGame) ? raw.secondGame : '';
    const preferredSecondGame = isGame(raw.preferredSecondGame) && next.includes(raw.preferredSecondGame) ? raw.preferredSecondGame : '';
    if (['await_second_start','second_started','completed'].includes(raw.phase) && !secondGame) return null;
    return {
      schemaVersion: 1,
      id: raw.id,
      phase: raw.phase,
      firstGame: raw.firstGame,
      secondGame,
      preferredSecondGame,
      invitedByCode: isCode(raw.invitedByCode) ? raw.invitedByCode : '',
      createdAt: Number.isFinite(raw.createdAt) && raw.createdAt > 0 ? raw.createdAt : 0,
      firstStartedAt: Number.isFinite(raw.firstStartedAt) && raw.firstStartedAt > 0 ? raw.firstStartedAt : 0,
      milestoneAt: Number.isFinite(raw.milestoneAt) && raw.milestoneAt > 0 ? raw.milestoneAt : 0,
      secondStartedAt: Number.isFinite(raw.secondStartedAt) && raw.secondStartedAt > 0 ? raw.secondStartedAt : 0,
      completedAt: Number.isFinite(raw.completedAt) && raw.completedAt > 0 ? raw.completedAt : 0
    };
  }
  function createState(options = {}) {
    const id = options.id;
    const firstGame = options.firstGame;
    if (!isCode(id) || !isGame(firstGame)) return null;
    const allowedNext = NEXT[firstGame] || [];
    const preferredSecondGame = isGame(options.preferredSecondGame) && allowedNext.includes(options.preferredSecondGame) ? options.preferredSecondGame : '';
    return normalizeState({
      schemaVersion: 1, id, phase: 'await_first_start', firstGame, secondGame: '',
      preferredSecondGame,
      invitedByCode: isCode(options.invitedByCode) ? options.invitedByCode : '',
      createdAt: Number.isFinite(options.at) && options.at > 0 ? options.at : Date.now()
    });
  }
  function choices(raw) {
    const state = normalizeState(raw);
    if (!state) return [];
    const values = [...(NEXT[state.firstGame] || [])];
    if (state.preferredSecondGame && values.includes(state.preferredSecondGame)) {
      return [state.preferredSecondGame, ...values.filter(value => value !== state.preferredSecondGame)];
    }
    return values;
  }
  function validateInvite(value) {
    if (!value || typeof value !== 'object') return null;
    const code = value.code;
    const firstGame = value.firstGame;
    const secondGame = value.secondGame;
    if (!isCode(code) || !isGame(firstGame) || !isGame(secondGame) || !(NEXT[firstGame] || []).includes(secondGame)) return null;
    return { code, firstGame, secondGame };
  }
  function transition(raw, event = {}) {
    const state = normalizeState(raw);
    const unchanged = { state, changed: false, events: [], rewardUnlocked: false };
    if (!state || !event || typeof event !== 'object') return unchanged;
    const game = event.game;
    const at = Number.isFinite(event.at) && event.at > 0 ? event.at : Date.now();
    if (event.type === 'session_started') {
      if (state.phase === 'await_first_start' && game === state.firstGame) {
        const next = { ...state, phase: 'first_started', firstStartedAt: at };
        return { state: next, changed: true, events: ['relay_game_1_started'], rewardUnlocked: false };
      }
      if (state.phase === 'await_second_start' && game === state.secondGame) {
        const next = { ...state, phase: 'second_started', secondStartedAt: at };
        return { state: next, changed: true, events: ['relay_game_2_started'], rewardUnlocked: false };
      }
      if (state.phase === 'await_first_start' && coreGameDifferent(game, state.firstGame)) {
        return { state: { ...state, phase: 'abandoned' }, changed: true, events: ['relay_abandoned'], rewardUnlocked: false };
      }
      if (state.phase === 'await_second_start' && coreGameDifferent(game, state.secondGame)) {
        return { state: { ...state, phase: 'abandoned' }, changed: true, events: ['relay_abandoned'], rewardUnlocked: false };
      }
      if (state.phase === 'first_started' && coreGameDifferent(game, state.firstGame)) {
        return { state: { ...state, phase: 'abandoned' }, changed: true, events: ['relay_abandoned'], rewardUnlocked: false };
      }
      if (state.phase === 'second_started' && coreGameDifferent(game, state.secondGame)) {
        return { state: { ...state, phase: 'abandoned' }, changed: true, events: ['relay_abandoned'], rewardUnlocked: false };
      }
      return unchanged;
    }
    if (event.type === 'game_completed') {
      if (state.phase === 'first_started' && game === state.firstGame) {
        const next = { ...state, phase: 'await_second', milestoneAt: at };
        return { state: next, changed: true, events: ['relay_milestone_reached'], rewardUnlocked: false };
      }
      if (state.phase === 'second_started' && game === state.secondGame) {
        const next = { ...state, phase: 'completed', completedAt: at };
        return { state: next, changed: true, events: ['relay_completed'], rewardUnlocked: true };
      }
      return unchanged;
    }
    if (event.type === 'second_selected') {
      if (state.phase !== 'await_second' || !choices(state).includes(game)) return unchanged;
      const next = { ...state, phase: 'await_second_start', secondGame: game };
      return { state: next, changed: true, events: ['relay_game_2_selected'], rewardUnlocked: false };
    }
    if (event.type === 'session_ended') {
      if (event.reason === 'game_completed') return unchanged;
      if (state.phase === 'first_started' && game === state.firstGame) {
        return { state: { ...state, phase: 'abandoned' }, changed: true, events: ['relay_abandoned'], rewardUnlocked: false };
      }
      if (state.phase === 'second_started' && game === state.secondGame) {
        return { state: { ...state, phase: 'abandoned' }, changed: true, events: ['relay_abandoned'], rewardUnlocked: false };
      }
      return unchanged;
    }
    return unchanged;
  }
  const API = Object.freeze({
    version: '1.0.0',
    GAME_IDS,
    NEXT,
    isGame,
    isCode,
    normalizeState,
    createState,
    choices,
    validateInvite,
    transition
  });
  const root = typeof window !== 'undefined' ? window : globalThis;
  Object.defineProperty(root, 'OSGARDRelayCore', { value: API, configurable: true, enumerable: false });
})();