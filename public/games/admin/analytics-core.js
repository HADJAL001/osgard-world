(() => {
  'use strict';
  const labels = Object.freeze({
    events: 'Игровые события', eventCount: 'Игровые события',
    distinctPlayers: 'Уникальные игроки', uniquePlayers: 'Уникальные игроки',
    players: 'Игроки', playerCount: 'Игроки',
    results: 'Результаты', resultCount: 'Результаты',
    games: 'Игры с активностью', reports: 'Жалобы',
    openReports: 'Открытые жалобы', sessions: 'Сессии',
  });

  function collectMetrics(source) {
    const found = [];
    const seen = new Set();
    function visit(value, depth) {
      if (!value || typeof value !== 'object' || depth > 3 || Array.isArray(value)) return;
      for (const [key, item] of Object.entries(value)) {
        const lowerKey = key ? key[0].toLowerCase() + key.slice(1) : key;
        const label = labels[key] || labels[lowerKey];
        if (label && typeof item === 'number' && Number.isFinite(item) && !seen.has(label)) {
          seen.add(label);
          found.push({ key: lowerKey, label, value: item });
        } else if (item && typeof item === 'object') {
          visit(item, depth + 1);
        }
      }
    }
    visit(source, 0);
    return found.slice(0, 9);
  }

  function compareMetrics(currentSource, previousSource) {
    const current = collectMetrics(currentSource);
    const previous = new Map(collectMetrics(previousSource).map(item => [item.label, item.value]));
    return current.map(item => {
      if (!previous.has(item.label)) return { ...item, comparison: null };
      const previousValue = previous.get(item.label);
      const delta = item.value - previousValue;
      const percent = previousValue === 0 ? null : delta / Math.abs(previousValue) * 100;
      return {
        ...item,
        comparison: {
          previousValue,
          delta,
          percent: Number.isFinite(percent) ? percent : null,
          direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
          zeroBaseline: previousValue === 0,
        },
      };
    });
  }

  function formatComparison(comparison) {
    if (!comparison) return 'Нет показателя в предыдущем периоде';
    if (comparison.delta === 0) return 'Без изменений к предыдущему периоду';
    const sign = comparison.delta > 0 ? '+' : '−';
    const amount = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Math.abs(comparison.delta));
    if (comparison.zeroBaseline) return sign + amount + ' · новая активность после нуля';
    const percent = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(Math.abs(comparison.percent));
    return sign + amount + ' · ' + sign + percent + '% к предыдущему периоду';
  }

  function presetRange(preset, nowValue = Date.now()) {
    const now = Number(nowValue);
    if (!Number.isFinite(now)) throw new TypeError('Текущее время должно быть числом.');
    const duration = ({
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '90d': 90 * 24 * 60 * 60 * 1000,
    })[preset];
    if (!duration) throw new RangeError('Неизвестный период.');
    return { from: now - duration, to: now };
  }

  function previousRange(range) {
    const from = Number(range?.from);
    const to = Number(range?.to);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 0 || from >= to) {
      throw new RangeError('Диапазон для сравнения некорректен.');
    }
    const duration = to - from;
    return { from: from - duration, to: from, duration };
  }

  function validateRange(range, nowValue = Date.now()) {
    const from = Number(range?.from);
    const to = Number(range?.to);
    const now = Number(nowValue);
    if (!Number.isFinite(from) || !Number.isFinite(to) || !Number.isFinite(now) ||
        from < 0 || from >= to || to > now + 5 * 60 * 1000) {
      return { ok: false, reason: 'Укажите корректный период: начало раньше конца, дата окончания не должна быть в будущем.' };
    }
    if (to - from > 366 * 24 * 60 * 60 * 1000) {
      return { ok: false, reason: 'Максимальная длительность периода — 366 дней.' };
    }
    return { ok: true, from, to, duration: to - from };
  }

  globalThis.OSGARDLiveOpsMetrics = Object.freeze({
    collectMetrics, compareMetrics, formatComparison, presetRange, previousRange, validateRange,
  });
})();
