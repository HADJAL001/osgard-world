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
  const materialChangeRules = Object.freeze({
    events: 10, eventCount: 10, results: 3, resultCount: 3,
    distinctPlayers: 3, uniquePlayers: 3, players: 3, playerCount: 3,
    sessions: 3, games: 1, reports: 1, openReports: 1,
  });
  const complaintKeys = new Set(['reports', 'openReports']);

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

  function metricSignal(row) {
    const comparison = row.comparison;
    if (!comparison || comparison.delta === 0) return null;
    if (row.value < 0 || comparison.previousValue < 0) return null;
    const minimumDelta = materialChangeRules[row.key] ?? 5;
    const relativeChanged = comparison.zeroBaseline ||
      (comparison.percent !== null && Math.abs(comparison.percent) >= 25);
    if (Math.abs(comparison.delta) < minimumDelta || !relativeChanged) return null;

    if (complaintKeys.has(row.key)) {
      return {
        kind: 'moderation_review',
        severity: comparison.delta > 0 ? 'attention' : 'review',
        title: comparison.delta > 0 ? 'Рост числа жалоб требует проверки' : 'Число жалоб изменилось в меньшую сторону',
        explanation: comparison.delta > 0
          ? 'Агрегат показывает рост счётчика. Он сам по себе не доказывает ухудшение качества или причину роста.'
          : 'Снижение счётчика само по себе не доказывает, что проблема решена: проверьте обработку и покрытие периода.',
        recommendedCheck: comparison.delta > 0
          ? 'Сверьте новые жалобы, открытые обращения и очередь модерации.'
          : 'Сверьте журнал закрытия жалоб и полноту поступающих событий.',
      };
    }
    return {
      kind: 'material_activity_change',
      severity: 'review',
      title: 'Заметное изменение: ' + row.label.toLowerCase(),
      explanation: 'Изменение превысило встроенный порог сигнала (не менее 25% и минимальное абсолютное изменение). Это повод для проверки, а не доказательство причины или бизнес-успеха.',
      recommendedCheck: complaintKeys.has(row.key)
        ? 'Сверьте агрегат с журналом модерации.'
        : 'Проверьте покрытие данных, доступность маршрутов и изменения продукта в этом периоде.',
    };
  }

  function buildDecisionBrief(snapshot, options = {}) {
    const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
    const range = snapshot?.range || null;
    const currentValidation = validateRange(range, now);
    const currentRows = collectMetrics(snapshot?.summary);
    const previousRows = snapshot?.previousSummary ? collectMetrics(snapshot.previousSummary) : [];
    const comparisonRequested = snapshot?.comparisonStatus !== 'disabled';
    const comparisonAvailable = comparisonRequested &&
      snapshot?.comparisonStatus === 'available' && Boolean(snapshot?.previousSummary);
    const previousRangeValue = snapshot?.previousRange || null;
    let alignedComparison = false;
    if (comparisonAvailable && currentValidation.ok && previousRangeValue) {
      const pFrom = Number(previousRangeValue.from);
      const pTo = Number(previousRangeValue.to);
      const duration = currentValidation.duration;
      alignedComparison = Number.isFinite(pFrom) && Number.isFinite(pTo) &&
        pFrom >= 0 && pFrom < pTo &&
        Math.abs((pTo - pFrom) - duration) <= 1000 &&
        Math.abs(pTo - currentValidation.from) <= 1000;
    }
    const rows = comparisonAvailable
      ? compareMetrics(snapshot.summary, snapshot.previousSummary)
      : currentRows.map(row => ({ ...row, comparison: null }));
    const warnings = [];
    if (!currentValidation.ok) warnings.push('Текущий диапазон некорректен: ' + currentValidation.reason);
    if (comparisonRequested && !comparisonAvailable) warnings.push('Сравнение не получено; изменения относительно предыдущего периода не рассчитаны.');
    if (comparisonAvailable && !alignedComparison) warnings.push('Предыдущий интервал не подтверждён как равный по длительности и смежный с текущим.');
    if (!currentRows.length) warnings.push('В ответе API не найдено известных числовых агрегатов.');
    if (currentRows.some(row => row.value < 0)) warnings.push('Есть отрицательные значения счётчиков; сигналы для таких показателей подавлены.');
    if (!snapshot?.cohorts || snapshot.cohorts.unavailable === true) warnings.push('Данные когорт недоступны или не были загружены.');
    if (!snapshot?.snapshots || snapshot.snapshots.unavailable === true) warnings.push('Сохранённые снимки недоступны или не были загружены.');

    const metrics = rows.map(row => {
      const signal = comparisonAvailable && alignedComparison ? metricSignal(row) : null;
      return {
        key: row.key,
        label: row.label,
        current: row.value,
        previous: row.comparison ? row.comparison.previousValue : null,
        delta: row.comparison ? row.comparison.delta : null,
        percent: row.comparison ? row.comparison.percent : null,
        zeroBaseline: Boolean(row.comparison?.zeroBaseline),
        signal,
      };
    });
    const signals = metrics.filter(row => row.signal).map(row => ({
      metric: row.key,
      label: row.label,
      current: row.current,
      previous: row.previous,
      delta: row.delta,
      percent: row.percent,
      zeroBaseline: row.zeroBaseline,
      ...row.signal,
    }));
    const actions = [...new Set(signals.map(signal => signal.recommendedCheck))];
    if (!comparisonAvailable) actions.push('Повторите сравнение после появления предыдущего периода; не интерпретируйте отсутствие baseline как нулевой результат.');
    if (warnings.length) actions.push('Перед принятием решения устраните предупреждения качества данных или зафиксируйте их как ограничения.');
    if (!signals.length && comparisonAvailable && alignedComparison) actions.push('Пороговых изменений не обнаружено. Это не доказывает отсутствие проблем: проверьте показатели и маршрутные тесты в исходном контексте.');

    const formatIso = value => Number.isFinite(Number(value)) ? new Date(Number(value)).toISOString() : null;
    const duration = currentValidation.ok ? currentValidation.duration : null;
    return {
      schema: 'osgard.liveops-decision-brief.v1',
      generatedAt: new Date(now).toISOString(),
      period: {
        from: formatIso(range?.from),
        to: formatIso(range?.to),
        durationMs: duration,
        valid: currentValidation.ok,
      },
      baseline: {
        requested: comparisonRequested,
        available: comparisonAvailable,
        aligned: alignedComparison,
        from: formatIso(previousRangeValue?.from),
        to: formatIso(previousRangeValue?.to),
      },
      dataQuality: {
        status: warnings.length ? 'degraded' : 'ok',
        summaryAvailable: Boolean(snapshot?.summary && !snapshot.summary.unavailable),
        cohortsAvailable: Boolean(snapshot?.cohorts && snapshot.cohorts.unavailable !== true),
        snapshotsAvailable: Boolean(snapshot?.snapshots && snapshot.snapshots.unavailable !== true),
        warnings,
      },
      metrics,
      signals,
      recommendedChecks: actions,
      interpretationLimits: [
        'Сигналы — эвристические пороги для проверки, не статистический тест и не прогноз.',
        'Сравнение не устанавливает причинно-следственную связь.',
        'Повышение количества событий не означает автоматически рост выручки, удержания или удовлетворённости.',
        'Отчёт содержит только whitelisted-агрегаты; исходные ответы API, идентификаторы, пути, email и токены не экспортируются.',
      ],
    };
  }

  globalThis.OSGARDLiveOpsMetrics = Object.freeze({
    collectMetrics, compareMetrics, formatComparison, presetRange, previousRange, validateRange,
    metricSignal, buildDecisionBrief,
  });
})();
