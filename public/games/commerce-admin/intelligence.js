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
  function buildDataQualityReport(data, warnings, inputValid, generatedAt) {
    const own = key => Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined;
    const validCount = value => typeof value === 'number'
      ? Number.isSafeInteger(value) && value >= 0
      : typeof value === 'string' && /^\d{1,15}$/.test(value);
    const fieldState = (key, kind) => {
      if (!own(key)) return { key, state:'missing', rowCount:null };
      const value = data[key];
      if (kind === 'array') {
        if (!Array.isArray(value)) return { key, state:'invalid', rowCount:null };
        const accepted = value.filter(item=>item && typeof item==='object' && !Array.isArray(item)).length;
        return { key, state:accepted===value.length?'present':'partial', rowCount:accepted };
      }
      if (kind === 'object') {
        return { key, state:value!==null && typeof value==='object' && !Array.isArray(value)?'present':'invalid', rowCount:null };
      }
      return { key, state:validCount(value)?'present':'invalid', rowCount:null };
    };
    const definitions = [
      {
        id:'commerce-order-ledger', title:'Заказы Commerce API',
        fields:[['ordersByStatus','array'],['grossPaidByCurrency','array']],
        window:'Накопительное окно доступных записей Commerce API',
        note:'Статусы заказов и gross по валютам. Пустой массив означает 0 строк в ответе, но не доказательство отсутствия продаж в других системах.',
        warningPrefixes:['schema:missing-ordersByStatus','schema:ordersByStatus','schema:missing-grossPaidByCurrency','schema:grossPaidByCurrency','currency:commerce-invalid','amount:commerce-invalid','revenue:missing-currency'],
      },
      {
        id:'service-reporting-ledger', title:'Отчёты сервисных интеграторов',
        fields:[['serviceAttributionConversions','array']],
        window:'Последние 30 дней',
        note:'Отдельный отчётный ledger интеграторов. Не складывать с заказами Commerce API и не считать независимым подтверждением платёжного провайдера.',
        warningPrefixes:['schema:missing-serviceAttributionConversions','schema:serviceAttributionConversions','currency:service-invalid','amount:service-gross-invalid','amount:service-refund-invalid','amount:service-net-invalid'],
      },
      {
        id:'consented-analytics', title:'Согласованные аналитические события',
        fields:[['analyticsEventsLast30Days','count'],['analyticsFunnel','object']],
        window:'Последние 30 дней',
        note:'Учитываются только согласованные события. Число событий не является числом уникальных пользователей.',
        warningPrefixes:['schema:analyticsEventsLast30Days','schema:missing-analyticsFunnel','schema:analyticsFunnel'],
      },
      {
        id:'paid-game-attribution', title:'Атрибуция оплаченных заказов по игре',
        fields:[['paidRevenueByAttribution','array']],
        window:'Последние 30 дней',
        note:'Непривязанные gameId понижают полноту сравнения источников; source/campaign — классификация, а не доказательство причинности.',
        warningPrefixes:['schema:missing-paidRevenueByAttribution','schema:paidRevenueByAttribution'],
      },
      {
        id:'lead-attribution', title:'Атрибуция заявок',
        fields:[['leadsByAttribution','array']],
        window:'Последние 90 дней',
        note:'Отдельное окно от заказов и игровых событий; не использовать как синхронную воронку оплаты.',
        warningPrefixes:['schema:missing-leadsByAttribution','schema:leadsByAttribution'],
      },
      {
        id:'owned-promotion', title:'OSGARD SELECT',
        fields:[['ownedPromoByService','array']],
        window:'Последние 30 дней',
        note:'Появления учитываются при выполнении consent/visibility-контракта. CTR с малой выборкой — описательный сигнал, не критерий автоматического победителя.',
        warningPrefixes:['schema:missing-ownedPromoByService','schema:ownedPromoByService'],
      },
      {
        id:'product-experiments', title:'Эксперименты продукта',
        fields:[['productExperimentStats','array']],
        window:'Окно агрегатов API; сверяйте определение exposure на стороне источника',
        note:'Без измеренных экспозиций и конверсий выбирать победителя нельзя.',
        warningPrefixes:['schema:missing-productExperimentStats','schema:productExperimentStats'],
      },
    ];
    const sources = definitions.map(definition => {
      const fields = definition.fields.map(([key,kind])=>fieldState(key,kind));
      const validFields = fields.filter(field=>field.state==='present' || field.state==='partial').length;
      const rowIssue = fields.some(field=>field.state==='partial' || field.state==='invalid');
      const relevantWarnings = (warnings || []).filter(item=>definition.warningPrefixes.some(prefix=>String(item.id||'').startsWith(prefix)));
      let status = validFields===0 ? 'unavailable' : validFields===fields.length && !rowIssue && relevantWarnings.length===0 ? 'measured' : 'partial';
      if (!inputValid) status='blocked';
      return {
        id:definition.id,
        title:definition.title,
        status,
        window:definition.window,
        fields:fields.map(field=>({key:field.key,state:field.state,rowCount:field.rowCount})),
        rowCount:fields.reduce((total,field)=>total+(field.rowCount===null?0:field.rowCount),0),
        warnings:relevantWarnings.map(item=>({
          id:String(item.id||'').slice(0,120),
          severity:['critical','warning','info'].includes(item.severity)?item.severity:'warning',
          title:String(item.title||'Предупреждение источника').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,180),
        })),
        note:definition.note,
      };
    });
    const measured = sources.filter(source=>source.status==='measured').length;
    const partial = sources.filter(source=>source.status==='partial').length;
    const unavailable = sources.filter(source=>source.status==='unavailable').length;
    const blocked = sources.filter(source=>source.status==='blocked').length;
    return {
      schema:'osgard.commerce-data-quality.v1',
      generatedAt:Number.isFinite(Date.parse(generatedAt))?new Date(generatedAt).toISOString():new Date().toISOString(),
      state:!inputValid?'blocked':partial===0&&unavailable===0?'complete':'limited',
      summary:{totalSources:sources.length,measured,partial,unavailable,blocked,warningCount:(warnings||[]).length},
      sources,
      comparability:{
        mixedCurrencyTotals:false,
        synchronizedCohortsAvailable:false,
        uniquePeopleAvailable:false,
        causalityProven:false,
        financialAudit:false,
      },
      caveats:[
        'Накопительные заказы нельзя напрямую сравнивать с 30-дневными событиями или отчётами интеграторов.',
        'Атрибуция заявок использует окно 90 дней; не соединяйте её с 30-дневными событиями как одну когорту.',
        'Отсутствующее поле означает неизвестные данные, а не ноль.',
        'Валюты остаются раздельными; обменный курс не применяется.',
        'Статусы «измерено/частично/недоступно» описывают наличие и структуру агрегатов, а не статистическую достоверность бизнеса.',
      ],
    };
  }

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
      dataQuality:buildDataQualityReport(data,warnings,inputValid,generatedAt),
      decisionPlan:buildDecisionPlan({generatedAt,alerts,promo}),
      interpretation:[
        'Валюты никогда не складываются между собой.',
        'commerce_orders и serviceAttributionConversions — разные источники; они не суммируются в одну цифру выручки.',
        'Отчёты интеграторов не являются независимым подтверждением платёжного провайдера или бухгалтерским отчётом.',
        'Аналитика основана на согласованных событиях и не доказывает число уникальных людей.',
      ]
    };
  }

  const SEVERITY_RANK = Object.freeze({ critical:0, warning:1, info:2 });
  const ACTION_RULES = [
    {
      matches: id => id.startsWith('revenue:negative:') || id.startsWith('refunds:counts:'),
      owner:'Commerce/API', effort:'medium',
      title:'Сверить возвраты и paid-события',
      rationale:'Сервисный ledger показывает потенциально несогласованные paid/refund-события. Это диагностический сигнал, не подтверждённый финансовый убыток.',
      steps:['Сопоставить окно отчёта, event types и idempotency webhook на сервере.','Проверить несколько агрегированных примеров в защищённом серверном журнале.','Не менять баланс и не выполнять возврат автоматически.'],
    },
    {
      matches: id => id.startsWith('revenue:missing-currency') || id.startsWith('currency:') || id.startsWith('amount:') || id.startsWith('schema:'),
      owner:'Commerce/API', effort:'small',
      title:'Исправить контракт данных',
      rationale:'Отсутствующее или некорректное поле нельзя трактовать как нулевое значение.',
      steps:['Проверить имя и тип поля в ответе агрегирующего API.','Исправить преобразование и добавить регрессионный тест на пустое/некорректное значение.','Пересчитать отчёт после исправления; не заполнять неизвестные суммы нулями.'],
    },
    {
      matches: id => id.startsWith('attribution:unknown'),
      owner:'Product Analytics', effort:'medium',
      title:'Повысить полноту атрибуции игр',
      rationale:'Часть оплаченных записей не связана с зарегистрированной игрой, поэтому сравнение источников неполно.',
      steps:['Проверить allow-list gameId на входе checkout и webhook.','Нормализовать source/campaign на сервере, не собирая лишние персональные данные.','Отслеживать долю unknown после изменения на том же агрегатном окне.'],
    },
    {
      matches: id => id.startsWith('refunds:rate:'),
      owner:'Commerce/API', effort:'small',
      title:'Проверить временное окно возвратов',
      rationale:'Доля возвратных событий превысила диагностический порог; это не отраслевой норматив и не доказательство проблемы платежей.',
      steps:['Сравнить определения paidEvents и refunds и временные окна.','Проверить повторную доставку событий и дедупликацию.','Сравнить динамику до и после подтверждённого изменения.'],
    },
    {
      matches: id => id.startsWith('analytics:empty'),
      owner:'Analytics', effort:'small',
      title:'Проверить согласие и доставку событий',
      rationale:'API не показывает согласованных событий в текущем окне; это может быть отсутствие событий или сбой доставки.',
      steps:['Проверить opt-in flow и default-deny очередь без чтения личных данных.','Проверить статус endpoint и количество принятых агрегированных событий.','Не включать аналитику в обход согласия пользователя.'],
    },
    {
      matches: id => id.startsWith('premium:observed-no-paid'),
      owner:'Commerce', effort:'medium',
      title:'Проверить путь checkout',
      rationale:'Есть просмотры Premium и нет связанных paid-записей в разных агрегатах. Это не конверсия и не доказательство поломки.',
      steps:['Выполнить тестовый checkout в разрешённой тестовой среде.','Проверить success/cancel return URL и обработчик webhook.','Сопоставить тестовый paid-event и order record без экспорта данных клиента.'],
    },
    {
      matches: id => id.startsWith('orders:none'),
      owner:'Commerce/API', effort:'small',
      title:'Подтвердить источник сводки заказов',
      rationale:'В текущем ответе отсутствуют записи заказов; причина из агрегата не определяется.',
      steps:['Проверить диапазон и права endpoint overview.','Сверить состояние тестового заказа с серверной сводкой.','Не делать вывод об отсутствии продаж во всех системах.'],
    },
    {
      matches: id => id.startsWith('experiments:no-exposure'),
      owner:'Product', effort:'small',
      title:'Не объявлять победителя эксперимента',
      rationale:'Без измеренных экспозиций и конверсий невозможно сравнить варианты.',
      steps:['Проверить, что событие exposure отправляется после фактического показа.','Проверить consent и назначение варианта.','Оставить решение без победителя до появления достаточных данных.'],
    },
  ];
  function actionForAlert(alert) {
    const id = String(alert?.id || 'unknown').slice(0, 120);
    const rule = ACTION_RULES.find(item => item.matches(id));
    const fallback = {
      owner:'Operations', effort:'small',
      title:'Проверить сигнал по первичному источнику',
      rationale:'Для этого сигнала нет специального сценария; сначала подтвердите его источник и полноту данных.',
      steps:['Открыть диагностическое описание сигнала.','Проверить соответствующий агрегат на сервере.','Зафиксировать результат до изменения конфигурации или бизнес-логики.'],
    };
    const selected = rule || fallback;
    const severity = Object.prototype.hasOwnProperty.call(SEVERITY_RANK, alert?.severity) ? alert.severity : 'info';
    return {
      id:'action:' + id,
      sourceAlertId:id,
      severity,
      owner:selected.owner,
      effort:selected.effort,
      title:selected.title,
      rationale:selected.rationale,
      steps:selected.steps.slice(),
      sourceTitle:String(alert?.title || 'Сигнал без названия').replace(/[\\u0000-\\u001f\\u007f]/g,' ').slice(0, 180),
      automated:false,
      status:'investigate',
    };
  }
  function buildDecisionPlan(report) {
    const alerts = Array.isArray(report?.alerts) ? report.alerts : [];
    const actions = alerts.map(actionForAlert);
    for (const promo of Array.isArray(report?.promo) ? report.promo : []) {
      if (promo?.sampleState !== 'small_sample') continue;
      const serviceId = String(promo.serviceId || 'unknown').replace(/[^a-z0-9-]/gi,'').slice(0, 50) || 'unknown';
      actions.push({
        id:'action:promo-small-sample:' + serviceId,
        sourceAlertId:'promo:small-sample:' + serviceId,
        severity:'info',
        owner:'Growth/Analytics',
        effort:'small',
        title:'Накопить измеряемую выборку для OSGARD SELECT',
        rationale:'CTR по малому числу показов слишком нестабилен для решения о победителе.',
        steps:['Проверить, что показ засчитывается только после согласованных условий видимости.','Накопить больше 30 валидных показов прежде чем интерпретировать CTR.','Не отключать и не масштабировать сервис автоматически.'],
        sourceTitle:'Сервис ' + serviceId + ': ' + String(promo.impressions || 0) + ' показов',
        automated:false,
        status:'investigate',
      });
    }
    const unique = new Map();
    for (const action of actions) if (!unique.has(action.id)) unique.set(action.id, action);
    const items = [...unique.values()].sort((a,b) =>
      (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9) ||
      a.sourceAlertId.localeCompare(b.sourceAlertId));
    return {
      schema:'osgard.commerce-decision-plan.v1',
      generatedAt:typeof report?.generatedAt === 'string' && Number.isFinite(Date.parse(report.generatedAt))
        ? new Date(report.generatedAt).toISOString() : new Date().toISOString(),
      mode:'deterministic-read-only',
      automationEnabled:false,
      total:items.length,
      critical:items.filter(item=>item.severity==='critical').length,
      warnings:items.filter(item=>item.severity==='warning').length,
      informational:items.filter(item=>item.severity==='info').length,
      items,
      interpretation:'Это детерминированный список проверок на основе агрегированных сигналов, а не финансовый совет. Никакие действия не выполняются автоматически.',
    };
  }
  function toMarkdown(report) {
    const plan = report?.decisionPlan || buildDecisionPlan(report);
    const clean = value => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/[\r\n]+/g,' ').replace(/\|/g,'\\|').replace(new RegExp(String.fromCharCode(96), 'g'), "'").slice(0, 500);
    const lines = [
      '# OSGARD Premium · план проверок',
      '',
      'Сформировано: ' + clean(plan.generatedAt),
      'Режим: deterministic-read-only · автоматические действия отключены',
      'Всего: ' + plan.total + ' · критические: ' + plan.critical + ' · проверить: ' + plan.warnings + ' · информационные: ' + plan.informational,
      '',
    ];
    if (!plan.items.length) lines.push('Сигналов для дополнительной проверки по текущим правилам нет. Это не гарантирует отсутствия проблем.');
    for (const item of plan.items) {
      lines.push('## [' + item.severity.toUpperCase() + '] ' + clean(item.title));
      lines.push('');
      lines.push('- Ответственный: ' + clean(item.owner) + '; трудоёмкость: ' + clean(item.effort));
      lines.push('- Источник: ' + clean(item.sourceTitle) + ' (' + clean(item.sourceAlertId) + ')');
      lines.push('- Почему: ' + clean(item.rationale));
      for (const step of item.steps) lines.push('- [ ] ' + clean(step));
      lines.push('');
    }
    lines.push('> ' + clean(plan.interpretation));
    const quality = report?.dataQuality;
    if (quality?.schema === 'osgard.commerce-data-quality.v1') {
      lines.push('');
      lines.push('## Качество и сопоставимость источников');
      lines.push('');
      lines.push('Состояние: ' + clean(quality.state) + ' · измерено: ' + quality.summary.measured + ' · частично: ' + quality.summary.partial + ' · недоступно: ' + quality.summary.unavailable);
      for (const source of quality.sources || []) {
        lines.push('- ' + clean(source.title) + ': ' + clean(source.status) + ' · окно: ' + clean(source.window) + ' · ' + clean(source.note));
      }
      for (const caveat of quality.caveats || []) lines.push('- Ограничение: ' + clean(caveat));
    }
    return lines.join('\n') + '\n';
  }

  function normalizeComparisonSnapshot(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) ||
        input.schema !== SCHEMA ||
        typeof input.generatedAt !== 'string' || !Number.isFinite(Date.parse(input.generatedAt)) ||
        !input.headline || typeof input.headline !== 'object' || Array.isArray(input.headline) ||
        !Array.isArray(input.currencies) || input.currencies.length > 100 ||
        !Array.isArray(input.alerts) || input.alerts.length > 500) {
      throw new Error('Файл не является поддерживаемым агрегированным отчётом OSGARD Premium.');
    }
    const safeCount = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
    const safePercent = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
    const seenCurrencies = new Set();
    const currencies = input.currencies.map(row => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('В отчёте обнаружена некорректная строка валюты.');
      const currency = currencyCode(row.currency);
      if (!currency || seenCurrencies.has(currency)) throw new Error('Коды валют должны быть корректными и уникальными.');
      seenCurrencies.add(currency);
      const minor = value => {
        const parsed = parseMinor(value, true);
        return parsed === null ? null : parsed.toString();
      };
      return {
        currency,
        paidOrders:safeCount(row.paidOrders),
        reportingPaidEvents:safeCount(row.reportingPaidEvents),
        reportingRefundEvents:safeCount(row.reportingRefundEvents),
        commerceGrossMinor:minor(row.commerceGrossMinor),
        reportingGrossMinor:minor(row.reportingGrossMinor),
        reportingRefundMinor:minor(row.reportingRefundMinor),
        reportingNetMinor:minor(row.reportingNetMinor),
      };
    });
    const alerts = input.alerts.map(row => {
      if (!row || typeof row !== 'object' || Array.isArray(row) ||
          typeof row.id !== 'string' || !row.id.trim() || row.id.length > 180 ||
          !['critical','warning','info'].includes(row.severity)) {
        throw new Error('Список сигналов содержит некорректный элемент.');
      }
      return {
        id:row.id.slice(0,180),
        severity:row.severity,
        title:String(row.title || 'Сигнал без названия').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,180),
      };
    });
    if (new Set(alerts.map(item=>item.id)).size !== alerts.length) throw new Error('Идентификаторы сигналов должны быть уникальными.');
    const sourceActions = Array.isArray(input.decisionPlan?.items) ? input.decisionPlan.items : Array.isArray(input.actions) ? input.actions : [];
    if (sourceActions.length > 500) throw new Error('План действий содержит слишком много записей.');
    const actions = sourceActions.map(row => {
      const actionId = typeof row?.sourceAlertId === 'string' ? row.sourceAlertId : row?.id;
      if (!row || typeof row !== 'object' || Array.isArray(row) ||
          typeof actionId !== 'string' || !actionId.trim() || actionId.length > 180 ||
          !['critical','warning','info'].includes(row.severity)) {
        throw new Error('План действий содержит некорректный элемент.');
      }
      return {
        id:actionId.slice(0,180),
        severity:row.severity,
        title:String(row.title || 'Проверка без названия').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,180),
      };
    });
    if (new Set(actions.map(item=>item.id)).size !== actions.length) throw new Error('Идентификаторы действий должны быть уникальными.');
    const rawQualitySources = input.dataQuality?.schema === 'osgard.commerce-data-quality.v1' && Array.isArray(input.dataQuality.sources)
      ? input.dataQuality.sources.slice(0,30) : Array.isArray(input.qualitySources) ? input.qualitySources.slice(0,30) : [];
    const qualityIds = new Set();
    const qualitySources = rawQualitySources.map(row => {
      if (!row || typeof row !== 'object' || Array.isArray(row) ||
          typeof row.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(row.id) ||
          !['measured','partial','unavailable','blocked','not-reported'].includes(row.status)) {
        throw new Error('Реестр качества источников содержит некорректный элемент.');
      }
      if (qualityIds.has(row.id)) throw new Error('Идентификаторы источников качества должны быть уникальными.');
      qualityIds.add(row.id);
      return {
        id:row.id,
        title:String(row.title || row.id).replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,160),
        status:row.status,
        window:String(row.window || 'Окно не указано').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,220),
      };
    });
    const windowNote = String(input.windowNote || input.window?.note || 'Окно источника в экспортированном отчёте не указано.')
      .replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,500);
    return {
      schema:SCHEMA,
      generatedAt:new Date(input.generatedAt).toISOString(),
      headline:{
        paidOrders:safeCount(input.headline.paidOrders),
        totalOrders:safeCount(input.headline.totalOrders),
        paidOrderShare:safePercent(input.headline.paidOrderShare),
      },
      currencies,
      alerts,
      actions,
      actionsAvailable:typeof input.actionsAvailable==='boolean'
        ? input.actionsAvailable
        : Array.isArray(input.decisionPlan?.items) || Array.isArray(input.actions),
      qualitySources,
      windowNote,
    };
  }
  function compareReports(previousInput, currentInput) {
    const previous = normalizeComparisonSnapshot(previousInput);
    const current = normalizeComparisonSnapshot(currentInput);
    const deltaCount = (oldValue, newValue) =>
      oldValue !== null && newValue !== null ? newValue - oldValue : null;
    const deltaPercent = (oldValue, newValue) =>
      oldValue !== null && newValue !== null ? Math.round((newValue-oldValue)*100)/100 : null;
    const metrics = [
      {id:'paidOrders',label:'Оплаченные заказы',unit:'count',
        previous:previous.headline.paidOrders,current:current.headline.paidOrders,
        delta:deltaCount(previous.headline.paidOrders,current.headline.paidOrders)},
      {id:'totalOrders',label:'Заказы всех статусов',unit:'count',
        previous:previous.headline.totalOrders,current:current.headline.totalOrders,
        delta:deltaCount(previous.headline.totalOrders,current.headline.totalOrders)},
      {id:'paidOrderShare',label:'Paid-доля записей',unit:'percentage-points',
        previous:previous.headline.paidOrderShare,current:current.headline.paidOrderShare,
        delta:deltaPercent(previous.headline.paidOrderShare,current.headline.paidOrderShare)},
    ];
    const oldCurrencies = new Map(previous.currencies.map(row=>[row.currency,row]));
    const newCurrencies = new Map(current.currencies.map(row=>[row.currency,row]));
    const currencyIds = [...new Set([...oldCurrencies.keys(),...newCurrencies.keys()])].sort();
    const amountFields = ['commerceGrossMinor','reportingGrossMinor','reportingRefundMinor','reportingNetMinor'];
    const countFields = ['paidOrders','reportingPaidEvents','reportingRefundEvents'];
    const currencyChanges = currencyIds.map(currency => {
      const oldRow = oldCurrencies.get(currency) || null;
      const newRow = newCurrencies.get(currency) || null;
      const presence = !oldRow ? 'new' : !newRow ? 'not-in-current' : 'compared';
      const result = {currency,presence,counts:{},amountsMinor:{}};
      for (const field of countFields) {
        result.counts[field] = {
          previous:oldRow?.[field] ?? null,
          current:newRow?.[field] ?? null,
          delta:oldRow && newRow ? deltaCount(oldRow[field],newRow[field]) : null,
        };
      }
      for (const field of amountFields) {
        const oldValue = oldRow?.[field] ?? null;
        const newValue = newRow?.[field] ?? null;
        let delta = null;
        if (oldRow && newRow && oldValue !== null && newValue !== null) {
          const oldMinor = parseMinor(oldValue,true), newMinor = parseMinor(newValue,true);
          if (oldMinor !== null && newMinor !== null) delta = (newMinor-oldMinor).toString();
        }
        result.amountsMinor[field] = {previous:oldValue,current:newValue,delta};
      }
      return result;
    });
    const diffItems = (oldItems,newItems,kind) => {
      const oldMap = new Map(oldItems.map(item=>[item.id,item]));
      const newMap = new Map(newItems.map(item=>[item.id,item]));
      const result = [];
      for (const item of newItems) {
        const old = oldMap.get(item.id);
        if (!old) result.push({kind,id:item.id,status:'new',severity:item.severity,title:item.title,previousSeverity:null});
        else if (old.severity !== item.severity || old.title !== item.title) {
          result.push({kind,id:item.id,status:'changed',severity:item.severity,title:item.title,previousSeverity:old.severity,previousTitle:old.title});
        }
      }
      for (const item of oldItems) if (!newMap.has(item.id)) {
        result.push({kind,id:item.id,status:'not-in-current',severity:item.severity,title:item.title,previousSeverity:item.severity,previousTitle:item.title});
      }
      const rank = {critical:0,warning:1,info:2};
      return result.sort((a,b)=>(rank[a.severity]??9)-(rank[b.severity]??9)||a.id.localeCompare(b.id));
    };
    const alertChanges = diffItems(previous.alerts,current.alerts,'alert');
    const actionChanges = diffItems(previous.actions,current.actions,'action');
    return {
      schema:'osgard.commerce-report-comparison.v1',
      previousGeneratedAt:previous.generatedAt,
      currentGeneratedAt:current.generatedAt,
      currentIsNewer:Date.parse(current.generatedAt)>=Date.parse(previous.generatedAt),
      metrics,
      currencies:currencyChanges,
      alertChanges,
      actionChanges,
      summary:{
        newCurrencies:currencyChanges.filter(row=>row.presence==='new').length,
        absentCurrencies:currencyChanges.filter(row=>row.presence==='not-in-current').length,
        newAlerts:alertChanges.filter(row=>row.status==='new').length,
        absentAlerts:alertChanges.filter(row=>row.status==='not-in-current').length,
        changedAlerts:alertChanges.filter(row=>row.status==='changed').length,
        newActions:actionChanges.filter(row=>row.status==='new').length,
        absentActions:actionChanges.filter(row=>row.status==='not-in-current').length,
        changedActions:actionChanges.filter(row=>row.status==='changed').length,
      },
      interpretation:'Сравниваются два снимка агрегатов, а не синхронные когорты. Окна заказов, сервисных событий и атрибуции различаются; дельты не доказывают причинность. Новая/отсутствующая валюта не заменяется нулём.',
    };
  }
  function toComparisonCsv(comparison) {
    const rows=[['section','metric','currency','previous','current','delta','status']];
    const add=(section,metric,currency,previous,current,delta,status='')=>rows.push([section,metric,currency,previous ?? '',current ?? '',delta ?? '',status]);
    for(const metric of comparison?.metrics || []) add('headline',metric.label,'',metric.previous,metric.current,metric.delta,metric.unit);
    for(const row of comparison?.currencies || []) {
      for(const [field,values] of Object.entries(row.counts || {})) add('currency-count',field,row.currency,values.previous,values.current,values.delta,row.presence);
      for(const [field,values] of Object.entries(row.amountsMinor || {})) add('currency-minor',field,row.currency,values.previous,values.current,values.delta,row.presence);
    }
    for(const item of [...(comparison?.alertChanges || []),...(comparison?.actionChanges || [])]) {
      add(item.kind,item.id,'',item.previousTitle || '',item.title || '',item.previousSeverity || '',item.status);
    }
    const escape=value=>{
      let text=String(value ?? '');
      if(/^\s*[=+\-@]/.test(text)) text="'"+text;
      return '"'+text.replace(/"/g,'""')+'"';
    };
    return '\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
  }

  function buildReportTrend(inputs) {
    if (!Array.isArray(inputs) || inputs.length < 2 || inputs.length > 10) {
      throw new Error('Для Trend Lab нужны от 2 до 10 JSON-отчётов.');
    }
    const snapshots = inputs.map(input=>normalizeComparisonSnapshot(input))
      .sort((a,b)=>Date.parse(a.generatedAt)-Date.parse(b.generatedAt));
    const timestamps = snapshots.map(snapshot=>snapshot.generatedAt);
    if (new Set(timestamps).size !== timestamps.length) {
      throw new Error('Отчёты имеют одинаковую метку времени; удалите дубликат, чтобы порядок тренда был однозначным.');
    }
    const currencyIds = [...new Set(snapshots.flatMap(snapshot=>snapshot.currencies.map(row=>row.currency)))].sort();
    if (currencyIds.length > 30) throw new Error('В загруженной истории более 30 разных валют; разделите отчёты на меньшие группы.');
    const amountFields = [
      ['commerceGrossMinor','Commerce gross'],
      ['reportingGrossMinor','Service reporting gross'],
      ['reportingRefundMinor','Service reporting refunds'],
      ['reportingNetMinor','Service reporting net'],
    ];
    const countFields = [
      ['paidOrders','Commerce paid orders'],
      ['reportingPaidEvents','Service paid events'],
      ['reportingRefundEvents','Service refund events'],
    ];
    const series = [];
    const addSeries = (id,label,kind,unit,currency,pointValues) => {
      const points = snapshots.map((snapshot,index) => {
        const entry = pointValues[index] ?? null;
        if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
          return { timestamp:snapshot.generatedAt, value:entry.value ?? null, state:entry.state || 'measured', missingReason:entry.missingReason || null };
        }
        return { timestamp:snapshot.generatedAt, value:entry, state:entry===null||entry===undefined?'unavailable':'measured', missingReason:entry===null||entry===undefined?'not-reported':null };
      });
      if (!points.some(point=>point.value!==null && point.value!==undefined)) return;
      series.push({id,label,kind,unit,currency:currency||null,points});
    };
    addSeries('headline:paidOrders','Оплаченные заказы','headline','count',null,snapshots.map(snapshot=>snapshot.headline.paidOrders));
    addSeries('headline:totalOrders','Заказы всех статусов','headline','count',null,snapshots.map(snapshot=>snapshot.headline.totalOrders));
    addSeries('headline:paidOrderShare','Paid-доля записей','headline','percentage-points',null,snapshots.map(snapshot=>snapshot.headline.paidOrderShare));
    for (const severity of ['critical','warning','info']) {
      addSeries('alerts:'+severity,'Сигналы · '+severity,'signals','count',null,
        snapshots.map(snapshot=>snapshot.alerts.filter(item=>item.severity===severity).length));
    }
    addSeries('actions:count','Рекомендации к проверке','actions','count',null,
      snapshots.map(snapshot=>snapshot.actionsAvailable ? snapshot.actions.length : {value:null,state:'unavailable',missingReason:'Движок плана отсутствовал в этом отчёте'}));
    for (const currency of currencyIds) {
      for (const [field,label] of countFields) {
        addSeries('currency-count:'+currency+':'+field,label+' · '+currency,'currency-count','count',currency,
          snapshots.map(snapshot=>{
            const row=snapshot.currencies.find(item=>item.currency===currency);
            return !row ? {value:null,state:'currency-not-reported',missingReason:'В отчёте нет этой валюты'} : row[field];
          }));
      }
      for (const [field,label] of amountFields) {
        addSeries('currency-minor:'+currency+':'+field,label+' · '+currency,'currency-amount','minor',currency,
          snapshots.map(snapshot=>{
            const row=snapshot.currencies.find(item=>item.currency===currency);
            return !row ? {value:null,state:'currency-not-reported',missingReason:'В отчёте нет этой валюты'} : row[field];
          }));
      }
    }
    const qualityIds=[...new Set(snapshots.flatMap(snapshot=>snapshot.qualitySources.map(source=>source.id)))].sort();
    const qualitySeries=qualityIds.map(id=>{
      const byId=snapshots.map(snapshot=>snapshot.qualitySources.find(source=>source.id===id)||null);
      const example=byId.find(Boolean);
      return {
        id,
        title:example?.title||id,
        points:snapshots.map((snapshot,index)=>{
          const source=byId[index];
          return {
            timestamp:snapshot.generatedAt,
            status:source?.status||'not-reported',
            window:source?.window||'Окно не передано в этом отчёте',
          };
        }),
      };
    });
    const qualityCounts = ['measured','partial','unavailable','blocked'].map(status=>({
      status,
      points:snapshots.map(snapshot=>snapshot.qualitySources.length
        ? snapshot.qualitySources.filter(source=>source.status===status).length : null),
    }));
    const notes = [...new Set(snapshots.map(snapshot=>snapshot.windowNote).filter(Boolean))];
    return {
      schema:'osgard.commerce-report-trend.v1',
      generatedAt:new Date().toISOString(),
      snapshots:snapshots.map(snapshot=>({
        generatedAt:snapshot.generatedAt,
        currencyCount:snapshot.currencies.length,
        alertCount:snapshot.alerts.length,
        actionsReported:snapshot.actionsAvailable,
        qualityReported:snapshot.qualitySources.length>0,
        windowNote:snapshot.windowNote,
      })),
      summary:{
        reportCount:snapshots.length,
        currencyCount:currencyIds.length,
        seriesCount:series.length,
        qualitySourceCount:qualityIds.length,
        reportsMissingQuality:snapshots.filter(snapshot=>snapshot.qualitySources.length===0).length,
        spanDays:Math.round((Date.parse(snapshots[snapshots.length-1].generatedAt)-Date.parse(snapshots[0].generatedAt))/86400000*100)/100,
      },
      series,
      qualitySeries,
      qualityCounts,
      windowNotes:notes,
      interpretation:'Это временной обзор агрегированных снимков, а не синхронные когорты. Накопительные заказы и скользящие окна могут двигаться по разным причинам. Отсутствующий источник/валюта остаётся пропуском; никакие валюты не складываются и причинность не выводится.',
    };
  }
  const QUALITY_STATUS_RANK = Object.freeze({ measured:0, partial:1, unavailable:2, blocked:3 });
  function buildTrendSignals(trend) {
    if (!trend || typeof trend !== 'object' || trend.schema !== 'osgard.commerce-report-trend.v1' ||
        !Array.isArray(trend.snapshots) || !Array.isArray(trend.series) || !Array.isArray(trend.qualitySeries)) {
      throw new Error('Trend Intelligence получил некорректный отчёт Trend Lab.');
    }
    const snapshots = trend.snapshots;
    const enoughHistory = snapshots.length >= 3;
    const signals = [];
    let skippedComparisons = 0;
    const latest = snapshots[snapshots.length - 1] || null;
    const previous = snapshots[snapshots.length - 2] || null;
    const timestamp = latest?.generatedAt || trend.generatedAt || new Date().toISOString();
    const add = (id,severity,title,source,observed,threshold,rationale,steps) => {
      signals.push({
        id:'trend:' + id + ':' + timestamp,
        ruleId:id,
        severity,
        title,
        source,
        previous:observed?.previous ?? null,
        current:observed?.current ?? null,
        delta:observed?.delta ?? null,
        threshold,
        rationale,
        steps,
        automated:false,
        status:'investigate',
      });
    };
    if (enoughHistory && latest && previous) {
      for (const source of trend.qualitySeries) {
        const points = Array.isArray(source.points) ? source.points : [];
        const before = points[points.length - 2];
        const after = points[points.length - 1];
        if (!before || !after || !Object.prototype.hasOwnProperty.call(QUALITY_STATUS_RANK,before.status) ||
            !Object.prototype.hasOwnProperty.call(QUALITY_STATUS_RANK,after.status)) {
          skippedComparisons++;
          continue;
        }
        if (QUALITY_STATUS_RANK[after.status] > QUALITY_STATUS_RANK[before.status]) {
          const severity = after.status === 'blocked' ? 'critical' : 'warning';
          add('quality-regression:' + source.id,severity,
            'Качество источника ухудшилось: ' + String(source.title || source.id).slice(0,120),
            'data-quality:' + source.id,
            {previous:before.status,current:after.status,delta:null},
            'Любой переход к менее доступному статусу',
            'Статус изменился с "' + before.status + '" на "' + after.status + '". Это сигнал проверить источник, а не доказательство причины.',
            ['Проверить статус и окно источника в исходных агрегатах.','Сверить API-контракт и время последнего успешного обновления.','После исправления обновить отчёт и подтвердить восстановление источника.']);
        }
      }
      const byId = new Map((trend.series || []).map(item => [item.id,item]));
      const alertRules = [
        {id:'alerts:critical',severityFor:delta=>delta>=2?'critical':'warning',minimum:1,label:'Критические сигналы увеличились',threshold:'Рост минимум на 1; +2 и более требуют критического приоритета',steps:['Открыть список критических сигналов в текущем Premium-отчёте.','Проверить, новые ли это сигналы или изменился состав источников.','Зафиксировать результат проверки в Decision Ops; не считать исчезновение сигнала доказательством устранения.']},
        {id:'alerts:warning',severityFor:()=> 'warning',minimum:3,label:'Число предупреждений заметно выросло',threshold:'Рост минимум на 3 предупреждения за один шаг снимков',steps:['Сравнить изменившиеся сигналы с предыдущим экспортом.','Сначала проверить предупреждения источников и схемы данных.','Не делать вывод о финансовом результате без проверки исходных данных.']},
      ];
      for (const rule of alertRules) {
        const serie = byId.get(rule.id);
        const points = Array.isArray(serie?.points) ? serie.points : [];
        const before=points[points.length-2], after=points[points.length-1];
        if (!before || !after || !Number.isSafeInteger(before.value) || !Number.isSafeInteger(after.value)) {
          skippedComparisons++;
          continue;
        }
        const delta=after.value-before.value;
        if (delta>=rule.minimum) add(rule.id,rule.severityFor(delta),rule.label,rule.id,
          {previous:before.value,current:after.value,delta},rule.threshold,
          'Сравниваются количества сигналов в двух последних снимках. Это приоритет расследования, не диагноз и не доказательство изменения бизнеса.',
          rule.steps);
      }
      const share=byId.get('headline:paidOrderShare');
      const sharePoints=Array.isArray(share?.points)?share.points:[];
      const beforeShare=sharePoints[sharePoints.length-2],afterShare=sharePoints[sharePoints.length-1];
      if (beforeShare && afterShare && Number.isFinite(beforeShare.value) && Number.isFinite(afterShare.value)) {
        const delta=Math.round((afterShare.value-beforeShare.value)*100)/100;
        if (delta<=-15) add('paid-order-share-drop','warning','Снизилась доля записей со статусом paid','headline:paidOrderShare',
          {previous:beforeShare.value,current:afterShare.value,delta},'Снижение на 15 процентных пунктов или более',
          'Это доля оплаченных записей среди всех записей заказа, не вероятность успешной оплаты и не когортная конверсия. Проверьте определения и состав снимков.',
          ['Проверить состав заказов по статусам и окно источника.','Сверить изменения API и миграции статусов между снимками.','Не считать это платёжным отказом без проверки checkout/webhook и исходных записей.']);
      } else skippedComparisons++;
      const paid=byId.get('headline:paidOrders');
      const paidPoints=Array.isArray(paid?.points)?paid.points:[];
      const beforePaid=paidPoints[paidPoints.length-2],afterPaid=paidPoints[paidPoints.length-1];
      if (beforePaid && afterPaid && Number.isSafeInteger(beforePaid.value) && Number.isSafeInteger(afterPaid.value) &&
          afterPaid.value < beforePaid.value) {
        add('paid-order-count-decreased','warning','Накопительный счётчик paid-заказов уменьшился','headline:paidOrders',
          {previous:beforePaid.value,current:afterPaid.value,delta:afterPaid.value-beforePaid.value},
          'Любое уменьшение между снимками',
          'Накопительный агрегат уменьшился. Причиной могут быть корректировка, удаление, фильтр или изменение API; данных недостаточно, чтобы выбрать причину.',
          ['Сверить оба снимка и окно данных.','Проверить изменения определения статуса/фильтров и журналы источника.','Подтвердить ожидаемую корректировку у владельца API.']);
      }
    } else {
      skippedComparisons++;
    }
    const rank={critical:0,warning:1,info:2};
    signals.sort((a,b)=>(rank[a.severity]??9)-(rank[b.severity]??9)||a.ruleId.localeCompare(b.ruleId));
    const summary={
      snapshotCount:snapshots.length,
      enoughHistory,
      generatedAt:new Date().toISOString(),
      signalCount:signals.length,
      critical:signals.filter(item=>item.severity==='critical').length,
      warnings:signals.filter(item=>item.severity==='warning').length,
      skippedComparisons,
      state:!enoughHistory?'insufficient-history':signals.some(item=>item.severity==='critical')?'attention-critical':signals.length?'attention':'no-rule-triggered',
    };
    return {
      schema:'osgard.commerce-trend-signals.v1',
      summary,
      sourceGeneratedAt:timestamp,
      minimumHistory:3,
      rules:[
        {id:'quality-regression',threshold:'Любое ухудшение измеренного статуса источника',meaning:'Проверить источник; причина автоматически не определяется.'},
        {id:'alerts:critical',threshold:'Рост критических сигналов минимум на 1; +2 повышает приоритет',meaning:'Сравнение числа сигналов в двух соседних снимках.'},
        {id:'alerts:warning',threshold:'Рост предупреждений минимум на 3',meaning:'Сравнение числа сигналов в двух соседних снимках.'},
        {id:'paid-order-share-drop',threshold:'Падение paid-доли записей минимум на 15 п.п.',meaning:'Не является когортной конверсией или вероятностью платежного успеха.'},
        {id:'paid-order-count-decreased',threshold:'Любое уменьшение накопительного числа paid-заказов',meaning:'Требует сверки снимков и определения источника.'},
      ],
      signals,
      skippedComparisons,
      interpretation:'Правила детерминированы и предназначены для приоритизации ручной проверки. Неизвестные значения не считаются нулём; валюты не складываются; тренды не доказывают причинность. Состояние без сигналов означает только, что эти фиксированные правила не сработали.',
    };
  }
  function toTrendSignalsCsv(report) {
    const rows=[['schema','signal_id','rule_id','severity','title','source','previous','current','delta','threshold','rationale','step']];
    for (const signal of report?.signals || []) {
      if (!Array.isArray(signal.steps) || !signal.steps.length) {
        rows.push([report.schema,signal.id,signal.ruleId,signal.severity,signal.title,signal.source,signal.previous ?? '',signal.current ?? '',signal.delta ?? '',signal.threshold,signal.rationale,'']);
      } else for (const step of signal.steps) rows.push([report.schema,signal.id,signal.ruleId,signal.severity,signal.title,signal.source,signal.previous ?? '',signal.current ?? '',signal.delta ?? '',signal.threshold,signal.rationale,step]);
    }
    rows.push(['summary','state','','','','','',report?.summary?.state || '', '',
      'snapshots='+String(report?.summary?.snapshotCount ?? '')+'; skipped='+String(report?.summary?.skippedComparisons ?? ''),
      report?.interpretation || '', '']);
    const escape=value=>{let text=String(value ?? '');if(/^\s*[=+\-@]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
    return '\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
  }
  function toTrendCsv(trend) {
    const rows=[['section','series_id','label','currency','timestamp','value','state','missing_reason','window']];
    const add=(section,id,label,currency,timestamp,value,state,missingReason='',window='')=>
      rows.push([section,id,label,currency||'',timestamp||'',value===null||value===undefined?'':value,state||'',missingReason||'',window||'']);
    for(const note of trend?.windowNotes||[]) add('window-note','period-semantics','Source periods differ','','',note,'warning');
    if(trend?.interpretation) add('interpretation','limits','Trend interpretation','','',trend.interpretation,'warning');
    for(const item of trend?.series||[]) {
      for(const point of item.points||[]) add(item.kind,item.id,item.label,item.currency,point.timestamp,point.value,point.state,point.missingReason,'');
    }
    for(const item of trend?.qualitySeries||[]) {
      for(const point of item.points||[]) add('quality-source',item.id,item.title,'',point.timestamp,point.status,point.status,'',point.window);
    }
    for(const item of trend?.qualityCounts||[]) {
      for(let index=0;index<item.points.length;index++) add('quality-count',item.status,'Источники качества', '',trend?.snapshots?.[index]?.generatedAt,item.points[index],item.points[index]===null?'not-reported':'measured');
    }
    const escape=value=>{
      let text=String(value ?? '');
      if(/^\s*[=+\-@]/.test(text)) text="'"+text;
      return '"'+text.replace(/"/g,'""')+'"';
    };
    return '\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
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

  const REVIEW_STATUSES = Object.freeze({
    open:'Открыто',
    investigating:'Проверяется',
    blocked:'Заблокировано',
    checked:'Проверка выполнена',
  });
  function normalizeReviewEntry(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return { ok:false, error:'Некорректная запись проверки.' };
    }
    const status = String(input.status || 'open');
    if (!Object.prototype.hasOwnProperty.call(REVIEW_STATUSES, status)) {
      return { ok:false, error:'Неизвестный статус проверки.' };
    }
    const rawNote = input.note === undefined || input.note === null ? '' : input.note;
    if (typeof rawNote !== 'string') return { ok:false, error:'Заметка должна быть текстом.' };
    if (rawNote.length > 240) return { ok:false, error:'Заметка должна содержать не более 240 символов.' };
    const note = rawNote.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
    const secretPatterns = [
      /\bBearer\s+[^\s]+/i,
      /\b(?:sk_live|sk_test|rk_live|pk_live)_[A-Za-z0-9_-]{8,}\b/i,
      /\b(?:password|passwd|api[_-]?key|access[_-]?token|secret)\s*[:=]\s*[^\s,;]+/i,
      /-----BEGIN [A-Z ]+PRIVATE KEY-----/i,
    ];
    if (secretPatterns.some(pattern => pattern.test(note))) {
      return { ok:false, error:'Заметка похожа на секрет. Удалите пароль/токен и повторите.' };
    }
    const rawUpdatedAt = input.updatedAt;
    let updatedAt = null;
    if (rawUpdatedAt !== undefined && rawUpdatedAt !== null && rawUpdatedAt !== '') {
      if (typeof rawUpdatedAt !== 'string' || !Number.isFinite(Date.parse(rawUpdatedAt))) {
        return { ok:false, error:'Некорректное время отметки.' };
      }
      updatedAt = new Date(rawUpdatedAt).toISOString();
    }
    return { ok:true, entry:{ status, note, updatedAt } };
  }
  function buildDecisionRegister(report, reviewState = {}) {
    const plan = report?.decisionPlan || buildDecisionPlan(report);
    const states = reviewState && typeof reviewState === 'object' && !Array.isArray(reviewState) ? reviewState : {};
    const items = (Array.isArray(plan.items) ? plan.items : []).map(action => {
      const candidate = Object.prototype.hasOwnProperty.call(states, action.id) ? normalizeReviewEntry(states[action.id]) : null;
      const entry = candidate?.ok ? candidate.entry : { status:'open', note:'', updatedAt:null };
      return {
        id:String(action.id || '').slice(0, 180),
        sourceAlertId:String(action.sourceAlertId || '').slice(0, 180),
        severity:['critical','warning','info'].includes(action.severity) ? action.severity : 'info',
        title:String(action.title || 'Проверка без названия').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0, 240),
        sourceTitle:String(action.sourceTitle || '').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0, 180),
        owner:String(action.owner || 'Operations').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0, 100),
        effort:['small','medium','large'].includes(action.effort) ? action.effort : 'medium',
        rationale:String(action.rationale || '').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0, 500),
        status:entry.status,
        note:entry.note,
        updatedAt:entry.updatedAt,
        steps:(Array.isArray(action.steps) ? action.steps : []).slice(0, 12).map(step=>String(step).replace(/[\u0000-\u001f\u007f]/g,' ').slice(0, 300)),
        automated:false,
      };
    });
    const summary = {
      total:items.length,
      open:items.filter(item=>item.status==='open').length,
      investigating:items.filter(item=>item.status==='investigating').length,
      blocked:items.filter(item=>item.status==='blocked').length,
      checked:items.filter(item=>item.status==='checked').length,
    };
    return {
      schema:'osgard.commerce-review-register.v1',
      generatedAt:new Date().toISOString(),
      sourceGeneratedAt:typeof report?.generatedAt==='string'&&Number.isFinite(Date.parse(report.generatedAt))?new Date(report.generatedAt).toISOString():null,
      mode:'session-only-read-only',
      persistence:'memory-only; cleared on report refresh and page exit',
      automationEnabled:false,
      summary,
      items,
      interpretation:'Отметки относятся только к этой вкладке и выбранному снимку отчёта. «Проверка выполнена» не означает, что исходный сигнал устранён; перепроверьте его после обновления агрегатов.',
    };
  }
  function importDecisionRegister(input, report) {
    if (!input || typeof input!=='object' || Array.isArray(input) ||
        input.schema!=='osgard.commerce-review-register.v1' ||
        !Array.isArray(input.items) || input.items.length>500 ||
        typeof input.generatedAt!=='string' || !Number.isFinite(Date.parse(input.generatedAt)) ||
        (input.sourceGeneratedAt!==null && input.sourceGeneratedAt!==undefined &&
          (typeof input.sourceGeneratedAt!=='string' || !Number.isFinite(Date.parse(input.sourceGeneratedAt))))) {
      throw new Error('Файл не является поддерживаемым реестром Decision Ops.');
    }
    if (!report || typeof report!=='object' || Array.isArray(report)) {
      throw new Error('Сначала загрузите текущий Premium-отчёт.');
    }
    const plan=report.decisionPlan || buildDecisionPlan(report);
    const currentItems=Array.isArray(plan.items)?plan.items:[];
    const currentIds=new Set(currentItems.map(item=>String(item.id||'')).filter(Boolean));
    const seen=new Set();
    const state=Object.create(null);
    const ignoredIds=[];
    for(const item of input.items) {
      if(!item || typeof item!=='object' || Array.isArray(item) ||
          typeof item.id!=='string' || !/^[a-z0-9][a-z0-9:._-]{0,179}$/i.test(item.id) ||
          seen.has(item.id)) {
        throw new Error('В реестре есть некорректный или повторный ID действия.');
      }
      seen.add(item.id);
      const normalized=normalizeReviewEntry({status:item.status,note:item.note,updatedAt:item.updatedAt});
      if(!normalized.ok) throw new Error('Запись "'+item.id.slice(0,80)+'": '+normalized.error);
      if(currentIds.has(item.id)) state[item.id]=normalized.entry;
      else ignoredIds.push(item.id.slice(0,180));
    }
    const matched=Object.keys(state).length;
    if(matched===0) throw new Error('Нет совпадающих ID действий в текущем отчёте. Отметки не изменены.');
    const sourceGeneratedAt=new Date(input.sourceGeneratedAt || input.generatedAt).toISOString();
    const targetGeneratedAt=typeof report.generatedAt==='string'&&Number.isFinite(Date.parse(report.generatedAt))?new Date(report.generatedAt).toISOString():null;
    return {
      schema:'osgard.commerce-review-import.v1',
      importedAt:new Date().toISOString(),
      sourceGeneratedAt,
      targetGeneratedAt,
      sourceIsOlderThanTarget:!!targetGeneratedAt&&Date.parse(sourceGeneratedAt)<Date.parse(targetGeneratedAt),
      matchedCount:matched,
      ignoredCount:ignoredIds.length,
      ignoredIds:ignoredIds.slice(0,100),
      reviewState:state,
      interpretation:'Перенесены только статусы и заметки действий, чьи стабильные ID присутствуют в текущем плане. Старые действия без совпадения пропущены. Файл обработан локально; изменения не отправлены на сервер.',
    };
  }
  function toReviewCsv(register) {
    const rows=[['schema','source_generated_at','action_id','source_alert_id','severity','title','owner','effort','status','note','updated_at','steps']];
    for (const item of register?.items || []) rows.push([
      register.schema, register.sourceGeneratedAt || '', item.id, item.sourceAlertId, item.severity,
      item.title, item.owner, item.effort, REVIEW_STATUSES[item.status] || item.status,
      item.note, item.updatedAt || '', (item.steps || []).join('; '),
    ]);
    rows.push(['interpretation','','','','','','','','',register?.interpretation || '','','']);
    const escape=value=>{
      let text=String(value ?? '');
      if(/^\s*[=+\-@]/.test(text)) text="'"+text;
      return '"'+text.replace(/"/g,'""')+'"';
    };
    return '\uFEFF'+rows.map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
  }
  function toReviewMarkdown(register) {
    const clean=value=>String(value??'').replace(/[\u0000-\u001f\u007f]/g,' ').replace(/[\r\n]+/g,' ').replace(/\|/g,'\\|').slice(0,500);
    const lines=[
      '# OSGARD Premium · реестр проверок',
      '',
      'Снимок отчёта: '+clean(register?.sourceGeneratedAt || 'не указан'),
      'Сформировано: '+clean(register?.generatedAt || ''),
      'Всего: '+Number(register?.summary?.total||0)+' · открыто: '+Number(register?.summary?.open||0)+' · проверяется: '+Number(register?.summary?.investigating||0)+' · заблокировано: '+Number(register?.summary?.blocked||0)+' · проверка выполнена: '+Number(register?.summary?.checked||0),
      '',
    ];
    for(const item of register?.items||[]){
      lines.push('## ['+clean(item.severity)+'] '+clean(item.title),'','- Статус: '+clean(REVIEW_STATUSES[item.status]||item.status),'- Ответственный: '+clean(item.owner),'- Источник: '+clean(item.sourceAlertId),'- Отметка: '+clean(item.updatedAt||'не отмечено'));
      if(item.note) lines.push('- Заметка оператора: '+clean(item.note));
      for(const step of item.steps||[]) lines.push('- [ ] '+clean(step));
      lines.push('');
    }
    lines.push('> '+clean(register?.interpretation||''));
    return lines.join('\n')+'\n';
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
    if (report?.dataQuality?.schema === 'osgard.commerce-data-quality.v1') {
      add('data-quality','state',report.dataQuality.state);
      for (const [key,value] of Object.entries(report.dataQuality.summary || {})) add('data-quality-summary',key,value);
      for (const source of report.dataQuality.sources || []) {
        add('data-quality-source',source.id,source.status,source.window);
        add('data-quality-note',source.id,source.note);
        for (const warning of source.warnings || []) add('data-quality-warning',warning.id,warning.title,warning.severity);
      }
      for (const [index,caveat] of (report.dataQuality.caveats || []).entries()) add('data-quality-caveat',String(index+1),caveat);
    }
    for (const action of report?.decisionPlan?.items || []) {
      add('action:' + action.severity, action.id, action.title);
      add('action-detail', action.sourceAlertId, action.owner + ' · ' + action.effort + ' · ' + action.steps.join('; '));
    }
    const escape = value => {
      let text = String(value ?? '');
      if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g,'""') + '"';
    };
    return '\uFEFF' + rows.map(row=>row.map(escape).join(',')).join('\r\n') + '\r\n';
  }

  window.OSGARDCommerceIntelligence = Object.freeze({ schema:SCHEMA, derive, formatMinor, toCsv, buildDecisionPlan, toMarkdown, normalizeComparisonSnapshot, compareReports, toComparisonCsv, buildReportTrend, buildTrendSignals, toTrendSignalsCsv, toTrendCsv, REVIEW_STATUSES, normalizeReviewEntry, buildDecisionRegister, importDecisionRegister, toReviewCsv, toReviewMarkdown });
})();