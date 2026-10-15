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
  const moneyMinor = value => {
    if (typeof value === 'bigint' && value >= 0n) return value;
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return BigInt(value);
    if (typeof value === 'string' && /^\d{1,30}$/.test(value)) {
      try { return BigInt(value); } catch {}
    }
    return 0n;
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
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object' && !Array.isArray(item));
    warnings.push({ id:'schema:' + label, severity:'warning', title:'Некорректный формат данных', detail:'Поле ' + label + ' не является списком; секция исключена из расчёта.' });
    return [];
  };
  function derive(overview, generatedAt = new Date().toISOString()) {
    const data = overview && typeof overview === 'object' && !Array.isArray(overview) ? overview : {};
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
      const entry = commerceCurrencies.get(code) || { currency:code, orders:0, grossMinor:0n };
      entry.orders += nonNegative(row.count);
      entry.grossMinor += moneyMinor(row.total_minor ?? row.totalMinor);
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
        grossMinor:0n, refundMinor:0n, netMinor:0n, services:new Set()
      };
      entry.conversions += nonNegative(row.conversions);
      entry.paidEvents += nonNegative(row.paidEvents);
      entry.refunds += nonNegative(row.refunds);
      entry.grossMinor += moneyMinor(row.grossPaidMinor);
      entry.refundMinor += moneyMinor(row.refundMinor);
      // Use the API's explicit net metric; never cross-sum different currencies.
      const netValue = row.netPaidMinor;
      if (typeof netValue === 'string' && /^-?\d{1,30}$/.test(netValue)) {
        try { entry.netMinor += BigInt(netValue); } catch {}
      } else {
        entry.netMinor += moneyMinor(row.grossPaidMinor) - moneyMinor(row.refundMinor);
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
        commerceGrossMinor:(commerce?.grossMinor ?? 0n).toString(),
        reportingConversions:service?.conversions ?? 0,
        reportingPaidEvents:service?.paidEvents ?? 0,
        reportingRefundEvents:service?.refunds ?? 0,
        reportingGrossMinor:(service?.grossMinor ?? 0n).toString(),
        reportingRefundMinor:(service?.refundMinor ?? 0n).toString(),
        reportingNetMinor:(service?.netMinor ?? 0n).toString(),
        serviceCount:service?.services.size ?? 0,
        refundEventRate:service?.paidEvents > 0 ? Math.round(service.refunds / service.paidEvents * 10000) / 100 : null,
        reportedNetNegative:!!service && service.netMinor < 0n,
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

    const funnelSource = data.analyticsFunnel && typeof data.analyticsFunnel === 'object' && !Array.isArray(data.analyticsFunnel) ? data.analyticsFunnel : {};
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
    if (!data || typeof data !== 'object' || Array.isArray(overview)) {
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
    if (premiumPageViews > 0 && paidOrders === 0) alert('premium:observed-no-paid','info','Есть просмотры Premium, но нет оплаченных заказов в Commerce API',
      'Это сигнал проверить checkout и webhook. Просмотры и заказы не привязаны здесь к одной когорте, поэтому это не conversion rate.');
    if (nonNegative(data.analyticsEventsLast30Days) === 0) alert('analytics:empty','info','Нет согласованных аналитических событий за 30 дней',
      'Проверьте consent, доставку событий и retention. Ноль означает ноль записей в ответе, а не нулевую аудиторию.');
    for (const warning of warnings) alerts.push(warning);
    const severityRank = { critical:0, warning:1, info:2 };
    alerts.sort((a,b)=>(severityRank[a.severity]??9)-(severityRank[b.severity]??9)||a.id.localeCompare(b.id));

    return {
      schema:SCHEMA,
      generatedAt:Number.isFinite(Date.parse(generatedAt))?new Date(generatedAt).toISOString():new Date().toISOString(),
      window:{ days:30, source:'server aggregate overview', note:'Лиды по атрибуции имеют окно 90 дней; остальные показатели ориентированы на последние 30 дней согласно контракту API.' },
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
    const amount = typeof value === 'string' && /^-?\d{1,30}$/.test(value) ? BigInt(value) : moneyMinor(value);
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