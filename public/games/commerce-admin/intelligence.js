(() => {
  'use strict';

  const SCHEMA = 'osgard.commerce-intelligence.v1';
  const ZERO_DECIMAL = new Set(['BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF']);
  const THREE_DECIMAL = new Set(['BHD','KWD','OMR','TND']);
  const nonNegative = value => {
    if (typeof value === 'number') return Number.isSafeInteger(value) && value >= 0 ? value : 0;
    if (typeof value === 'string' && /^\d{1,15}$/.test(value)) return Number(value);
    return 0;
  };
  const parseMinor = (value, allowNegative = false) => {
    if (typeof value === 'bigint') return allowNegative || value >= 0n ? value : null;
    if (typeof value === 'number' && Number.isSafeInteger(value) && (allowNegative || value >= 0)) return BigInt(value);
    if (typeof value === 'string' && (allowNegative ? /^-?\d{1,30}$/ : /^\d{1,30}$/).test(value)) {
      try { return BigInt(value); } catch {}
    }
    return null;
  };
  const currencyCode = value => {
    const code = String(value || '').toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : '';
  };
  const exponent = code => ZERO_DECIMAL.has(code) ? 0 : THREE_DECIMAL.has(code) ? 3 : 2;
  const sum = values => values.reduce((total, value) => total + BigInt(value || 0), 0n);
  const rate = (numerator, denominator) => {
    const n = nonNegative(numerator), d = nonNegative(denominator);
    return d > 0 ? Math.round((n / d) * 10000) / 100 : null;
  };
  const pctLabel = value => value === null ? 'Недостаточно данных' : value.toFixed(1) + '%';
  const validRows = (value, warnings, label) => {
    if (value === undefined || value === null) {
      warnings.push({ id:'schema:missing-' + label, severity:'warning', title:'Данные отсутствуют в ответе API', detail:'Поле ' + label + ' не было передано; его нельзя трактовать как ноль.' });
      return [];
    }
    if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object' && !Array.isArray(item));
    warnings.push({ id:'schema:' + label, severity:'warning', title:'Некорректный формат данных', detail:'Поле ' + label + ' не является списком; секция исключена из расчёта.' });
    return [];
  };
  function derive(overview, generatedAt = new Date().toISOString()) {
    const inputValid = !!overview && typeof overview === 'object' && !Array.isArray(overview);
    const data = inputValid ? overview : {};
    const warnings = [];
    const statuses = validRows(data.ordersByStatus, warnings, 'ordersByStatus')
      .map(row => ({ status:String(row.status || 'unknown').slice(0,40).toLowerCase(), count:nonNegative(row.count) }));
    const statusCounts = Object.create(null);
    for (const row of statuses) statusCounts[row.status] = (statusCounts[row.status] || 0) + row.count;
    const totalOrders = Object.values(statusCounts).reduce((a,b)=>a+b,0);
    const paidOrders = statusCounts.paid || 0;

    const commerceCurrencies = new Map();
    for (const row of validRows(data.grossPaidByCurrency, warnings, 'grossPaidByCurrency')) {
      const code = currencyCode(row.currency);
      if (!code) {
        warnings.push({ id:'currency:commerce-invalid', severity:'warning', title:'Строка суммы исключена', detail:'API вернул сумму с некорректным кодом валюты.' });
        continue;
      }
      const entry = commerceCurrencies.get(code) || { currency:code, orders:0, grossMinor:0n, grossValid:true };
      entry.orders += nonNegative(row.count);
      const amount = parseMinor(row.total_minor ?? row.totalMinor);
      if (amount === null) {
        entry.grossValid = false;
        warnings.push({ id:'amount:commerce-invalid', severity:'warning', title:'Сумма заказа исключена из расчёта', detail:'В накопительной сводке заказов обнаружена некорректная сумма; количество заказов сохранено, денежный итог помечен как недоступный.' });
      } else entry.grossMinor += amount;
      commerceCurrencies.set(code, entry);
    }

    const serviceCurrencies = new Map();
    for (const row of validRows(data.serviceAttributionConversions, warnings, 'serviceAttributionConversions')) {
      const code = currencyCode(row.currency);
      if (!code) {
        if (row.currency !== null && row.currency !== undefined && row.currency !== '') warnings.push({
          id:'currency:service-invalid', severity:'warning', title:'Сумма интегратора исключена', detail:'Сервисный отчёт содержит некорректный код валюты.'
        });
        continue;
      }
      const entry = serviceCurrencies.get(code) || {
        currency:code, conversions:0, paidEvents:0, refunds:0,
        grossMinor:0n, refundMinor:0n, netMinor:0n, grossValid:true, refundValid:true, netValid:true, services:new Set()
      };
      entry.conversions += nonNegative(row.conversions);
      entry.paidEvents += nonNegative(row.paidEvents);
      entry.refunds += nonNegative(row.refunds);
      const grossAmount = parseMinor(row.grossPaidMinor);
      const refundAmount = parseMinor(row.refundMinor);
      if (grossAmount === null) {
        entry.grossValid = false;
        warnings.push({ id:'amount:service-gross-invalid', severity:'warning', title:'Gross-сумма интегратора недоступна', detail:'Сервисный отчёт содержит некорректную gross-сумму; она не заменяется нулём.' });
      } else entry.grossMinor += grossAmount;
      if (refundAmount === null) {
        entry.refundValid = false;
        warnings.push({ id:'amount:service-refund-invalid', severity:'warning', title:'Сумма возвратов интегратора недоступна', detail:'Сервисный отчёт содержит некорректную сумму возвратов; она не заменяется нулём.' });
      } else entry.refundMinor += refundAmount;
      // Use the API's explicit net metric; never cross-sum different currencies.
      const netValue = parseMinor(row.netPaidMinor, true);
      if (netValue !== null) entry.netMinor += netValue;
      else if (grossAmount !== null && refundAmount !== null) entry.netMinor += grossAmount - refundAmount;
      else {
        entry.netValid = false;
        warnings.push({ id:'amount:service-net-invalid', severity:'warning', title:'Net-сумма интегратора недоступна', detail:'Net нельзя достоверно посчитать из неполных денежных полей.' });
      }
      if (typeof row.serviceId === 'string' && /^[a-z0-9-]{1,60}$/i.test(row.serviceId)) entry.services.add(row.serviceId);
      serviceCurrencies.set(code, entry);
    }

    const currencySet = new Set([...commerceCurrencies.keys(), ...serviceCurrencies.keys()]);
    const currencies = [...currencySet].sort().map(code => {
      const commerce = commerceCurrencies.get(code);
      const service = serviceCurrencies.get(code);
      return {
        currency:code,
        paidOrders:commerce?.orders ?? 0,
        commerceGrossMinor:commerce ? (commerce.grossValid ? commerce.grossMinor.toString() : null) : '0',
        reportingConversions:service?.conversions ?? 0,
        reportingPaidEvents:service?.paidEvents ?? 0,
        reportingRefundEvents:service?.refunds ?? 0,
        reportingGrossMinor:service ? (service.grossValid ? service.grossMinor.toString() : null) : '0',
        reportingRefundMinor:service ? (service.refundValid ? service.refundMinor.toString() : null) : '0',
        reportingNetMinor:service ? (service.netValid ? service.netMinor.toString() : null) : '0',
        serviceCount:service?.services.size ?? 0,
        refundEventRate:service?.paidEvents > 0 ? Math.round(service.refunds / service.paidEvents * 10000) / 100 : null,
        reportedNetNegative:!!service && service.netValid && service.netMinor < 0n,
        exponent:exponent(code),
      };
    });

    const attribution = validRows(data.paidRevenueByAttribution, warnings, 'paidRevenueByAttribution');
    let attributedOrders = 0;
    let unknownGameOrders = 0;
    for (const row of attribution) {
      const orders = nonNegative(row.orders);
      attributedOrders += orders;
      if (!row.gameId || row.gameId === 'unknown') unknownGameOrders += orders;
    }
    const unknownAttributionRate = attributedOrders > 0 ? Math.round(unknownGameOrders / attributedOrders * 10000) / 100 : null;

    const funnelValid = !!data.analyticsFunnel && typeof data.analyticsFunnel === 'object' && !Array.isArray(data.analyticsFunnel);
    if (!funnelValid) warnings.push({ id:'schema:analyticsFunnel', severity:'warning', title:'Воронка не предоставлена', detail:'API не вернул корректный analyticsFunnel; нули ниже не следует трактовать как измеренный нулевой трафик.' });
    const funnelSource = funnelValid ? data.analyticsFunnel : {};
    const catalogViews = nonNegative(funnelSource.catalogViews);
    const gameStarts = nonNegative(funnelSource.gameStarts);
    const completedSessions = nonNegative(funnelSource.completedSessions);
    const premiumPageViews = nonNegative(funnelSource.premiumPageViews);
    const leadSubmittedEvents = nonNegative(funnelSource.leadSubmittedEvents);
    const crossPromoClicks = nonNegative(funnelSource.crossPromoClicks);
    const funnel = {
      catalogViews, gameStarts, completedSessions, premiumPageViews, leadSubmittedEvents, crossPromoClicks,
      catalogToStartEventRatio:rate(gameStarts,catalogViews),
      startToCompletionEventRatio:rate(completedSessions,gameStarts),
      completionToStartDelta:gameStarts > 0 ? completedSessions - gameStarts : null,
      definition:'Доли считаются по количеству согласованных событий за 30 дней, а не по уникальным людям или сквозным когортам.'
    };

    const promoMap = new Map();
    for (const row of validRows(data.ownedPromoByService, warnings, 'ownedPromoByService')) {
      const id = String(row.serviceId || '').toLowerCase();
      if (!/^[a-z0-9-]{1,60}$/.test(id)) continue;
      const entry = promoMap.get(id) || { serviceId:id, impressions:0, clicks:0, games:new Set() };
      entry.impressions += nonNegative(row.impressions);
      entry.clicks += nonNegative(row.clicks);
      if (typeof row.gameId === 'string' && /^[a-z0-9-]{1,60}$/i.test(row.gameId)) entry.games.add(row.gameId);
      promoMap.set(id, entry);
    }
    const promo = [...promoMap.values()].map(row => ({
      serviceId:row.serviceId, impressions:row.impressions, clicks:row.clicks,
      clickRate:rate(row.clicks,row.impressions), gameCount:row.games.size,
      sampleState:row.impressions >= 30 ? 'descriptive' : 'small_sample',
      note:row.impressions >= 30 ? 'Описательный CTR; не доказывает причинный эффект.' : 'Малая выборка: не ранжировать как победителя.'
    })).sort((a,b)=>a.clickRate===null&&b.clickRate===null?a.serviceId.localeCompare(b.serviceId):a.clickRate===null?1:b.clickRate===null?-1:b.clickRate-a.clickRate||b.impressions-a.impressions||a.serviceId.localeCompare(b.serviceId));

    const alerts = [];
    const alert = (id,severity,title,detail) => alerts.push({ id,severity,title,detail });
    if (!inputValid) {
      alert('overview:invalid','critical','API вернул некорректную сводку','Данные не прошли базовую проверку структуры.');
    }
    if (totalOrders === 0) alert('orders:none','info','Заказы не зарегистрированы в Commerce API','Это означает отсутствие записей в текущем ответе API, а не доказательство отсутствия продаж в других системах.');
    if (paidOrders > 0 && commerceCurrencies.size === 0) alert('revenue:missing-currency','warning','Есть оплаченные заказы без сводки по валютам','Проверьте заполнение amount_total/currency и запрос агрегатов.');
    if (unknownAttributionRate !== null && unknownAttributionRate >= 20) alert('attribution:unknown','warning','Заметная доля заказов не связана с конкретной игрой',
      'Без gameId: ' + unknownGameOrders + ' из ' + attributedOrders + ' атрибутированных оплаченных заказов (' + unknownAttributionRate.toFixed(1) + '%). Это снижает точность сравнения каналов.');
    for (const row of currencies) {
      if (row.reportedNetNegative) alert('revenue:negative:' + row.currency,'critical','Сервисные возвраты выше поступлений · ' + row.currency,
        'Сумма возвратов интеграторов выше суммы их положительных paid-событий в этой валюте; проверьте отчёт и порядок событий.');
      if (row.refundEventRate !== null && row.refundEventRate > 5) alert('refunds:rate:' + row.currency,'warning','Высокая доля возвратных событий · ' + row.currency,
        'Возвратные события составляют ' + row.refundEventRate.toFixed(1) + '% от paid-событий сервисных интеграторов. Это диагностический порог, не отраслевой норматив.');
      if (row.reportingRefundEvents > row.reportingPaidEvents) alert('refunds:counts:' + row.currency,'warning','Возвратных событий больше, чем paid-событий · ' + row.currency,
        'Проверьте окно отчёта и соответствие типов conversion events.');
    }
    const experimentRows = validRows(data.productExperimentStats, warnings, 'productExperimentStats');
    if (experimentRows.length && !experimentRows.some(row => nonNegative(row.exposures) > 0)) {
      alert('experiments:no-exposure','info','Нет зафиксированных показов эксперимента','Нельзя выбрать победителя без измеренных экспозиций и конверсий.');
    }
    if (premiumPageViews > 0 && attributedOrders === 0) alert('premium:observed-no-paid','info','Есть просмотры Premium, но нет paid-заказов в атрибуционном отчёте за 30 дней',
      'Это сигнал проверить checkout и webhook. Просмотры и заказы не привязаны здесь к одной когорте, поэтому это не conversion rate.');
    const analyticsEventsPresent = (typeof data.analyticsEventsLast30Days === 'number' && Number.isSafeInteger(data.analyticsEventsLast30Days) && data.analyticsEventsLast30Days >= 0) ||
      (typeof data.analyticsEventsLast30Days === 'string' && /^\d{1,15}$/.test(data.analyticsEventsLast30Days));
    if (!analyticsEventsPresent) warnings.push({ id:'schema:analyticsEventsLast30Days', severity:'warning', title:'Число событий не предоставлено', detail:'API не вернул корректный счётчик согласованных событий; это неизвестное значение, а не ноль.' });
    else if (nonNegative(data.analyticsEventsLast30Days) === 0) alert('analytics:empty','info','Нет согласованных аналитических событий за 30 дней',
      'Проверьте consent, доставку событий и retention. Ноль означает ноль записей в ответе, а не нулевую аудиторию.');
    for (const warning of warnings) alerts.push(warning);
    const severityRank = { critical:0, warning:1, info:2 };
    alerts.sort((a,b)=>(severityRank[a.severity]??9)-(severityRank[b.severity]??9)||a.id.localeCompare(b.id));

    return {
      schema:SCHEMA,
      generatedAt:Number.isFinite(Date.parse(generatedAt))?new Date(generatedAt).toISOString():new Date().toISOString(),
      window:{
        source:'server aggregate overview',
        note:'Периоды различаются: ordersByStatus/grossPaidByCurrency — накопительные; paidRevenueByAttribution, serviceAttributionConversions и аналитические события — последние 30 дней; атрибуция лидов — 90 дней.'
      },
      headline:{
        paidOrders,
        totalOrders,
        paidOrderShare:totalOrders>0?Math.round(paidOrders/totalOrders*10000)/100:null,
        trackedCurrencyCount:commerceCurrencies.size,
        serviceReportingCurrencyCount:serviceCurrencies.size,
        attributedPaidOrders:attributedOrders,
        unknownGameOrders,
        unknownAttributionRate,
        consentedEvents:nonNegative(data.analyticsEventsLast30Days),
        warnings:alerts.filter(item=>item.severity==='critical'||item.severity==='warning').length,
      },
      orderStatuses:Object.keys(statusCounts).sort().map(status=>({status,count:statusCounts[status]})),
      currencies,
      funnel,
      promo,
      alerts,
      interpretation:[
        'Валюты никогда не складываются между собой.',
        'commerce_orders и serviceAttributionConversions — разные источники; они не суммируются в одну цифру выручки.',
        'Отчёты интеграторов не являются независимым подтверждением платёжного провайдера или бухгалтерским отчётом.',
        'Аналитика основана на согласованных событиях и не доказывает число уникальных людей.',
      ]
    };
  }

  function formatMinor(value, currency) {
    const code = currencyCode(currency);
    if (!code) return '—';
    const amount = parseMinor(value, true);
    if (amount === null) return '—';
    const exp = exponent(code);
    const negative = amount < 0n;
    const absolute = negative ? -amount : amount;
    const scale = 10n ** BigInt(exp);
    const whole = absolute / scale;
    const fraction = exp ? String(absolute % scale).padStart(exp,'0') : '';
    let wholeText;
    try { wholeText = new Intl.NumberFormat('ru-RU',{maximumFractionDigits:0}).format(whole); }
    catch { wholeText = whole.toString(); }
    return (negative ? '−' : '') + wholeText + (exp ? ',' + fraction : '') + ' ' + code;
  }

  function toCsv(report) {
    const rows = [['section','metric','value','currency']];
    const add = (section,metric,value,currency='') => rows.push([section,metric,value,currency]);
    for (const [key,value] of Object.entries(report?.headline || {})) add('headline',key,value ?? '');
    for (const row of report?.currencies || []) {
      add('commerce', 'paidOrders', row.paidOrders,row.currency);
      add('commerce', 'grossMinor', row.commerceGrossMinor,row.currency);
      add('service-reporting', 'grossMinor', row.reportingGrossMinor,row.currency);
      add('service-reporting', 'refundMinor', row.reportingRefundMinor,row.currency);
      add('service-reporting', 'netMinor', row.reportingNetMinor,row.currency);
      add('service-reporting', 'paidEvents', row.reportingPaidEvents,row.currency);
      add('service-reporting', 'refundEvents', row.reportingRefundEvents,row.currency);
    }
    for (const row of report?.alerts || []) add('alert:' + row.severity,row.id,row.title);
    const escape = value => {
      let text = String(value ?? '');
      if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g,'""') + '"';
    };
    return '\uFEFF' + rows.map(row=>row.map(escape).join(',')).join('\r\n') + '\r\n';
  }

  root.OSGARDCommerceIntelligence = Object.freeze({ schema:SCHEMA, derive, formatMinor, toCsv });
})();