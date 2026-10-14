import { analyzeExperiment, parseExperimentImport } from './evidence-engine.js';

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const countIds = ['a-exposures', 'a-conversions', 'b-exposures', 'b-conversions'];
  let latestReport = null;
  let latestSource = 'manual';
  let importWarnings = [];
  const number = value => Number(value);
  const fmtPct = value => value === null || !Number.isFinite(value) ? '—' : (value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + '%';
  const fmtPp = value => value === null || !Number.isFinite(value) ? '—' : (value > 0 ? '+' : '') + (value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + ' п.п.';
  const fmtNum = value => value === null || !Number.isFinite(value) ? '—' : Math.round(value).toLocaleString('ru-RU');
  const readCounts = () => ({
    experimentId: 'catalog-hero-cta-v1',
    variants: {
      a: { exposures: number($('a-exposures').value), conversions: number($('a-conversions').value) },
      b: { exposures: number($('b-exposures').value), conversions: number($('b-conversions').value) },
    },
    warnings: importWarnings,
    sourceFormat: latestSource,
  });
  function setStatus(node, text, state) {
    node.textContent = text;
    node.dataset.state = state || '';
  }
  function setCounts(data, source) {
    $('a-exposures').value = String(data.variants.a.exposures);
    $('a-conversions').value = String(data.variants.a.conversions);
    $('b-exposures').value = String(data.variants.b.exposures);
    $('b-conversions').value = String(data.variants.b.conversions);
    latestSource = source || data.sourceFormat || 'import';
    importWarnings = [...(data.warnings || [])];
    setStatus($('analysis-status'), 'Загружены агрегаты: источник ' + latestSource + '. Нажми «Рассчитать доказательства».', 'ok');
  }
  function renderWarnings(items) {
    const list = $('warnings');
    list.replaceChildren();
    for (const item of items.slice(0, 12)) {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    }
    if (!items.length) {
      const li = document.createElement('li');
      li.textContent = 'Формат и числовые ограничения пройдены. Это не подтверждает корректность источника или рандомизации.';
      list.append(li);
    }
  }
  function render(report) {
    latestReport = report;
    $('rate-a').textContent = fmtPct(report.rates.a);
    $('rate-b').textContent = fmtPct(report.rates.b);
    $('rate-a-ci').textContent = report.rateIntervals95.a ? '95%: ' + fmtPct(report.rateIntervals95.a.lower) + ' — ' + fmtPct(report.rateIntervals95.a.upper) : '95% интервал: —';
    $('rate-b-ci').textContent = report.rateIntervals95.b ? '95%: ' + fmtPct(report.rateIntervals95.b.lower) + ' — ' + fmtPct(report.rateIntervals95.b.upper) : '95% интервал: —';
    $('lift-abs').textContent = fmtPp(report.absoluteLift);
    $('lift-ci').textContent = report.absoluteLiftInterval95 ? '95%: ' + fmtPp(report.absoluteLiftInterval95.lower) + ' — ' + fmtPp(report.absoluteLiftInterval95.upper) : '95% интервал: —';
    $('lift-rel').textContent = report.relativeLift === null ? '—' : (report.relativeLift > 0 ? '+' : '') + (report.relativeLift * 100).toLocaleString('ru-RU', { maximumFractionDigits: 2, minimumFractionDigits: 2 }) + '%';
    $('decision-card').dataset.state = report.statusCode;
    $('decision-title').textContent = report.statusLabel;
    $('decision-guidance').textContent = report.guidance;
    const maxRate = Math.max(report.rates.a || 0, report.rates.b || 0, 0.0001);
    $('bar-a').style.width = Math.max(0, Math.min(100, ((report.rates.a || 0) / maxRate) * 100)) + '%';
    $('bar-b').style.width = Math.max(0, Math.min(100, ((report.rates.b || 0) / maxRate) * 100)) + '%';
    $('bar-a-label').textContent = fmtPct(report.rates.a);
    $('bar-b-label').textContent = fmtPct(report.rates.b);
    $('sample-observed').textContent = fmtNum(report.planning.achievedMinimumPerVariant);
    $('sample-target').textContent = fmtNum(report.planning.targetSamplePerVariant);
    $('sample-progress').textContent = report.planning.targetSamplePerVariant === null
      ? 'Проверь базовую конверсию и MDE.'
      : report.planning.achievedMinimumPerVariant >= report.planning.targetSamplePerVariant
        ? 'Плановая выборка достигнута по обеим группам.'
        : 'До ориентировочного плана: ' + fmtNum(Math.max(0, report.planning.targetSamplePerVariant - report.planning.achievedMinimumPerVariant)) + ' наблюдений в меньшей группе.';
    renderWarnings(report.warnings);
    $('export-report').disabled = false;
    $('copy-report').disabled = false;
    setStatus($('analysis-status'), 'Расчёт готов. Источник данных: ' + latestSource + '. В production ничего не отправлено.', 'ok');
  }
  $('parse-import').addEventListener('click', () => {
    try {
      const result = parseExperimentImport($('import-text').value, $('import-file').files?.[0]?.name || '');
      setCounts(result, result.sourceFormat);
      setStatus($('import-status'), 'Импорт разобран. События сведены к агрегатам; исходные записи не сохраняются.', 'ok');
    } catch (error) {
      setStatus($('import-status'), error instanceof Error ? error.message : 'Не удалось прочитать импорт.', 'error');
    }
  });
  $('import-file').addEventListener('change', async () => {
    const file = $('import-file').files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      $('import-file').value = '';
      setStatus($('import-status'), 'Файл больше 10 МБ. Уменьши экспорт до одной кампании.', 'error');
      return;
    }
    try {
      $('import-text').value = await file.text();
      setStatus($('import-status'), 'Файл прочитан локально (' + fmtNum(file.size) + ' байт). Нажми «Разобрать данные».', 'ok');
    } catch {
      setStatus($('import-status'), 'Браузер не смог прочитать файл.', 'error');
    }
  });
  $('clear-import').addEventListener('click', () => {
    $('import-text').value = '';
    $('import-file').value = '';
    setStatus($('import-status'), 'Импорт очищен; ручные числа не изменены.', 'ok');
  });
  $('analyze').addEventListener('click', () => {
    try {
      const data = readCounts();
      const report = analyzeExperiment(data, {
        baselineRatePercent: number($('baseline-rate').value),
        minimumDetectableEffectPp: number($('mde-pp').value),
      });
      render(report);
    } catch (error) {
      latestReport = null;
      $('export-report').disabled = true;
      $('copy-report').disabled = true;
      setStatus($('analysis-status'), error instanceof Error ? error.message : 'Проверь введённые числа.', 'error');
    }
  });
  countIds.forEach(id => $(id).addEventListener('input', () => {
    latestSource = 'manual';
    importWarnings = [];
  }));
  $('example').addEventListener('click', () => {
    setCounts({
      variants: { a: { exposures: 1200, conversions: 60 }, b: { exposures: 1210, conversions: 73 } },
      warnings: ['Учебные числа, созданные кнопкой примера. Не являются данными OSGARD и не доказывают эффект.'],
      sourceFormat: 'training-example',
    }, 'training-example');
    setStatus($('import-status'), 'Загружен только учебный пример. Для делового решения замени числа реальным экспортом.', 'error');
    $('analyze').click();
  });
  function buildExport() {
    if (!latestReport) throw new Error('Сначала рассчитай отчёт.');
    return {
      ...latestReport,
      generatedAt: new Date().toISOString(),
      inputSource: latestSource,
      inputNotice: latestSource === 'training-example' ? 'Учебный пример; не live-данные.' : 'Агрегаты, введённые оператором или рассчитанные из локально импортированных событий.',
      privacy: { uploadedToServer: false, rawEventIdentifiersExported: false, rawRowsPersisted: false },
    };
  }
  $('export-report').addEventListener('click', () => {
    try {
      const report = buildExport();
      const blob = new Blob([JSON.stringify(report, null, 2) + '\n'], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'osgard-experiment-evidence-' + new Date().toISOString().slice(0, 10) + '.json';
      anchor.click();
      URL.revokeObjectURL(url);
      setStatus($('export-status'), 'Агрегированный JSON-отчёт подготовлен и скачан.', 'ok');
    } catch (error) {
      setStatus($('export-status'), error instanceof Error ? error.message : 'Экспорт не выполнен.', 'error');
    }
  });
  $('copy-report').addEventListener('click', async () => {
    try {
      const report = buildExport();
      const summary = [
        'OSGARD Growth Evidence Lab / ' + report.experimentId,
        'A: ' + report.counts.a.conversions + '/' + report.counts.a.exposures + ' (' + fmtPct(report.rates.a) + ')',
        'B: ' + report.counts.b.conversions + '/' + report.counts.b.exposures + ' (' + fmtPct(report.rates.b) + ')',
        'Lift B − A: ' + fmtPp(report.absoluteLift),
        '95% CI: ' + (report.absoluteLiftInterval95 ? fmtPp(report.absoluteLiftInterval95.lower) + ' — ' + fmtPp(report.absoluteLiftInterval95.upper) : '—'),
        'Status: ' + report.statusLabel,
        'Source: ' + report.inputSource,
        'Caveat: aggregated evidence only; not proof of causality.',
      ].join('\n');
      if (!navigator.clipboard?.writeText) throw new Error('Буфер обмена недоступен в этом контексте. Используй экспорт JSON.');
      await navigator.clipboard.writeText(summary);
      setStatus($('export-status'), 'Краткая сводка скопирована.', 'ok');
    } catch (error) {
      setStatus($('export-status'), error instanceof Error ? error.message : 'Не удалось скопировать сводку.', 'error');
    }
  });
  // No network, cookies, localStorage, or analytics scripts are used on this page.
})();
