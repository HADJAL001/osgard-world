(function (root) {
  'use strict';
  const STREAK_KEY = 'osgard.signal-run.daily-streak.v1';
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function todayUtc(now = new Date()) {
    return now.toISOString().slice(0, 10);
  }

  function isValidDate(value) {
    if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
    const date = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function normalizeDate(value, today = todayUtc()) {
    return isValidDate(value) ? value : (isValidDate(today) ? today : todayUtc());
  }

  function seedForDate(value) {
    if (!isValidDate(value)) throw new RangeError('A valid UTC calendar date is required.');
    const input = 'osgard-signal-run-daily-v1:' + value;
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
      hash ^= input.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRandom(seed) {
    let state = seed >>> 0;
    return function nextRandom() {
      let value = state += 0x6D2B79F5;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function previousUtcDate(value) {
    if (!isValidDate(value)) throw new RangeError('A valid UTC calendar date is required.');
    return new Date(Date.parse(value + 'T00:00:00.000Z') - 86400000).toISOString().slice(0, 10);
  }

  function nextStreak(previous, today) {
    if (!isValidDate(today)) throw new RangeError('A valid UTC calendar date is required.');
    const previousDate = previous && isValidDate(previous.lastDate) ? previous.lastDate : '';
    const previousCount = previous && Number.isSafeInteger(previous.count) && previous.count > 0 ? previous.count : 0;
    if (previousDate === today) return { lastDate: today, count: previousCount || 1 };
    const count = previousDate === previousUtcDate(today) ? previousCount + 1 : 1;
    return { lastDate: today, count };
  }

  root.OSGARDSignalDaily = Object.freeze({
    todayUtc,
    isValidDate,
    normalizeDate,
    seedForDate,
    createRandom,
    previousUtcDate,
    nextStreak,
    streakStorageKey: STREAK_KEY
  });
})(typeof window !== 'undefined' ? window : globalThis);
