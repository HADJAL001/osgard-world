import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

const engineSource = await readFile('public/games/commerce-admin/intelligence.js', 'utf8');
const windowStub = {};
runInNewContext(engineSource, { window: windowStub });
const engine = windowStub.OSGARDCommerceIntelligence;
assert.ok(engine, 'premium intelligence engine must attach to the same-origin window');
const fixedDate = '2026-10-15T10:00:00.000Z';

function fixture(overrides = {}) {
  return {
    ordersByStatus: [
      { status:'paid', count:3 },
      { status:'pending', count:1 },
      { status:'failed', count:2 },
    ],
    grossPaidByCurrency: [
      { currency:'USD', total_minor:'10000', count:2 },
      { currency:'EUR', total_minor:'5000', count:1 },
    ],
    paidRevenueByAttribution: [
      { gameId:'time', source:'direct', campaign:null, currency:'USD', orders:2, totalMinor:'10000' },
      { gameId:'unknown', source:'direct', campaign:null, currency:'EUR', orders:1, totalMinor:'5000' },
    ],
    serviceAttributionConversions: [
      { serviceId:'marcosa', gameId:'time', source:'direct', campaign:null, currency:'USD', conversions:5, paidEvents:4, refunds:1, grossPaidMinor:'12000', refundMinor:'2000', netPaidMinor:'10000' },
      { serviceId:'projects', gameId:'remix', source:'owned', campaign:'alpha', currency:'EUR', conversions:3, paidEvents:2, refunds:0, grossPaidMinor:'7000', refundMinor:'0', netPaidMinor:'7000' },
    ],
    analyticsEventsLast30Days:1200,
    analyticsFunnel: {
      catalogViews:100, gameStarts:80, completedSessions:40, premiumPageViews:25,
      leadSubmittedEvents:8, crossPromoClicks:20,
    },
    ownedPromoByService: [
      { serviceId:'marcosa', gameId:'time', impressions:100, clicks:12 },
      { serviceId:'marcosa', gameId:'remix', impressions:80, clicks:4 },
      { serviceId:'projects', gameId:'time', impressions:5, clicks:2 },
    ],
    productExperimentStats: [{ experimentId:'hero', variant:'a', exposures:0, conversions:0 }],
    ...overrides,
  };
}

test('separates currencies and independent Commerce/API integration ledgers', () => {
  const report = engine.derive(fixture(), fixedDate);
  assert.equal(report.schema, 'osgard.commerce-intelligence.v1');
  assert.equal(report.currencies.map(row => row.currency).join(','), 'EUR,USD');
  const eur = report.currencies.find(row => row.currency === 'EUR');
  const usd = report.currencies.find(row => row.currency === 'USD');
  assert.equal(eur.commerceGrossMinor, '5000');
  assert.equal(eur.reportingGrossMinor, '7000');
  assert.equal(usd.commerceGrossMinor, '10000');
  assert.equal(usd.reportingRefundMinor, '2000');
  assert.equal(usd.reportingNetMinor, '10000');
  assert.equal(report.headline.paidOrders, 3);
  assert.equal(report.headline.totalOrders, 6);
  assert.equal(report.headline.trackedCurrencyCount, 2);
  assert.equal(report.generatedAt, fixedDate);
  assert.ok(!Object.prototype.hasOwnProperty.call(report.headline, 'totalRevenueMinor'), 'the engine must not create a cross-currency total');
});

test('preserves currency precision including zero- and three-decimal currencies and large integer strings', () => {
  assert.equal(engine.formatMinor('12345678901234567890','JPY').replace(/[\s\u00a0\u202f]/g,''),'12345678901234567890JPY');
  assert.equal(engine.formatMinor('12345','KWD'),'12,345 KWD');
  assert.equal(engine.formatMinor('10000','USD'),'100,00 USD');
  assert.equal(engine.formatMinor('-250','EUR'),'−2,50 EUR');
  assert.equal(engine.formatMinor('bad','USD'),'—');
});

test('computes transparent event ratios without claiming unique-person conversion', () => {
  const report = engine.derive(fixture(), fixedDate);
  assert.equal(report.funnel.catalogToStartEventRatio,80);
  assert.equal(report.funnel.startToCompletionEventRatio,50);
  assert.match(report.funnel.definition,/не по уникальным людям/i);
  assert.equal(report.funnel.premiumPageViews,25);
  assert.equal(report.headline.paidOrderShare,50);
});

test('undefined denominators stay undefined rather than becoming zero percent', () => {
  const report = engine.derive(fixture({
    ordersByStatus:[],
    grossPaidByCurrency:[],
    paidRevenueByAttribution:[],
    serviceAttributionConversions:[],
    analyticsEventsLast30Days:0,
    analyticsFunnel:{catalogViews:0,gameStarts:0,completedSessions:0,premiumPageViews:3,leadSubmittedEvents:0,crossPromoClicks:0},
    ownedPromoByService:[{serviceId:'projects',gameId:'remix',impressions:0,clicks:1}],
  }), fixedDate);
  assert.equal(report.headline.paidOrderShare,null);
  assert.equal(report.headline.unknownAttributionRate,null);
  assert.equal(report.funnel.catalogToStartEventRatio,null);
  assert.equal(report.funnel.startToCompletionEventRatio,null);
  assert.ok(report.alerts.some(alert=>alert.id==='orders:none'));
  assert.ok(report.alerts.some(alert=>alert.id==='premium:observed-no-paid'));
  assert.ok(report.alerts.some(alert=>alert.id==='analytics:empty'));
  assert.equal(report.promo[0].sampleState,'small_sample');
});

test('reports return-event anomalies and attribution gaps as diagnostic signals', () => {
  const report = engine.derive(fixture({
    paidRevenueByAttribution:[
      {gameId:'unknown',source:'direct',orders:9,currency:'USD',totalMinor:'10'},
      {gameId:'time',source:'direct',orders:1,currency:'USD',totalMinor:'10'},
    ],
    serviceAttributionConversions:[
      {serviceId:'marcosa',currency:'USD',conversions:3,paidEvents:2,refunds:5,grossPaidMinor:'500',refundMinor:'900',netPaidMinor:'-400'},
    ],
  }),fixedDate);
  assert.ok(report.alerts.some(alert=>alert.id==='attribution:unknown'));
  assert.ok(report.alerts.some(alert=>alert.id==='revenue:negative:USD'));
  assert.ok(report.alerts.some(alert=>alert.id==='refunds:rate:USD'));
  assert.ok(report.alerts.some(alert=>alert.id==='refunds:counts:USD'));
  assert.ok(report.alerts.every(alert=>['critical','warning','info'].includes(alert.severity)));
});

test('promo summary groups by service and does not rank undefined rates above measured rates', () => {
  const report = engine.derive(fixture({
    ownedPromoByService:[
      {serviceId:'alpha',gameId:'time',impressions:0,clicks:5},
      {serviceId:'beta',gameId:'time',impressions:100,clicks:10},
      {serviceId:'beta',gameId:'remix',impressions:100,clicks:30},
    ],
  }),fixedDate);
  assert.equal(report.promo[0].serviceId,'beta');
  assert.equal(report.promo[0].impressions,200);
  assert.equal(report.promo[0].clicks,40);
  assert.equal(report.promo[0].clickRate,20);
  assert.equal(report.promo[0].sampleState,'descriptive');
  assert.equal(report.promo[1].clickRate,null);
});

test('malformed currency rows are excluded and surfaced as a warning', () => {
  const report=engine.derive(fixture({
    grossPaidByCurrency:[
      {currency:'US$',total_minor:'100000',count:99},
      {currency:'USD',total_minor:'1000',count:1},
    ],
    serviceAttributionConversions:[],
  }),fixedDate);
  assert.equal(report.currencies.length,1);
  assert.equal(report.currencies[0].currency,'USD');
  assert.ok(report.alerts.some(alert=>alert.id==='currency:commerce-invalid'));
});

test('malformed money stays unavailable and never silently becomes zero', () => {
  const report=engine.derive(fixture({
    grossPaidByCurrency:[{currency:'USD',total_minor:'not-a-number',count:3}],
    serviceAttributionConversions:[],
  }),fixedDate);
  const usd=report.currencies.find(row=>row.currency==='USD');
  assert.ok(usd);
  assert.equal(usd.paidOrders,3);
  assert.equal(usd.commerceGrossMinor,null);
  assert.equal(engine.formatMinor(usd.commerceGrossMinor,'USD'),'—');
  assert.ok(report.alerts.some(alert=>alert.id==='amount:commerce-invalid'));
});

test('CSV export is aggregate-only and resists spreadsheet formula injection', () => {
  const report=engine.derive(fixture(),fixedDate);
  report.alerts.push({severity:'warning',id:'=HYPERLINK("evil")',title:'@SUM(1,1)',detail:'not exported'});
  const csv=engine.toCsv(report);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'));
  assert.ok(csv.includes('"\'@SUM(1,1)"'));
  assert.ok(!csv.includes('email'));
  assert.ok(!csv.includes('order_id'));
  assert.ok(!csv.includes('session_id'));
});


test('decision engine produces ordered, explainable, read-only actions from aggregate signals', () => {
  const report = engine.derive(fixture({
    paidRevenueByAttribution:[{gameId:'unknown',source:'direct',orders:9,currency:'USD',totalMinor:'10'}],
    serviceAttributionConversions:[
      {serviceId:'marcosa',currency:'USD',conversions:3,paidEvents:2,refunds:5,grossPaidMinor:'500',refundMinor:'900',netPaidMinor:'-400'},
    ],
    analyticsEventsLast30Days:0,
    analyticsFunnel:{catalogViews:10,gameStarts:5,completedSessions:2,premiumPageViews:4,leadSubmittedEvents:0,crossPromoClicks:1},
    ownedPromoByService:[{serviceId:'projects',gameId:'remix',impressions:5,clicks:2}],
  }), fixedDate);
  const plan = report.decisionPlan;
  assert.equal(plan.schema, 'osgard.commerce-decision-plan.v1');
  assert.equal(plan.mode, 'deterministic-read-only');
  assert.equal(plan.automationEnabled, false);
  assert.ok(plan.total >= 4);
  assert.ok(plan.critical >= 1);
  assert.equal(plan.items[0].severity, 'critical', 'critical integrity signals must be ordered first');
  assert.ok(plan.items.some(item => item.title === 'Сверить возвраты и paid-события'));
  assert.ok(plan.items.some(item => item.title === 'Повысить полноту атрибуции игр'));
  assert.ok(plan.items.some(item => item.title === 'Проверить согласие и доставку событий'));
  assert.ok(plan.items.some(item => item.title === 'Накопить измеряемую выборку для OSGARD SELECT'));
  assert.ok(plan.items.every(item => item.automated === false && item.status === 'investigate' && item.steps.length >= 2));
  assert.ok(plan.items.every(item => ['Commerce/API','Product Analytics','Analytics','Growth/Analytics','Operations','Product','Commerce'].includes(item.owner)));
});

test('Markdown/CSV exports include action checklist but never calculate mixed-currency totals', () => {
  const report = engine.derive(fixture(), fixedDate);
  report.alerts = [
    {id:'revenue:missing-currency',severity:'warning',title:'=HYPERLINK("bad")',detail:'Inspect server contract'},
    {id:'analytics:empty',severity:'info',title:'@SUM(1,1)',detail:'No consented events'},
  ];
  report.decisionPlan = engine.buildDecisionPlan(report);
  const markdown = engine.toMarkdown(report);
  assert.ok(markdown.startsWith('# OSGARD Premium · план проверок\n'));
  assert.ok(markdown.includes('- [ ] Проверить имя и тип поля в ответе агрегирующего API.'));
  assert.ok(markdown.endsWith('\n'));
  assert.ok(!markdown.includes('\\n'), 'Markdown should contain real line breaks, not literal backslash-n text');
  const csv = engine.toCsv(report);
  assert.ok(csv.includes('"action:warning"') || csv.includes('"action:info"'));
  assert.ok(csv.includes('"action-detail"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'), 'CSV formula injection should remain neutralized');
  assert.ok(!Object.prototype.hasOwnProperty.call(report.headline, 'totalRevenueMinor'));
});


test('comparison engine reports per-currency deltas without zero-filling missing currencies', () => {
  const previous = {
    schema:engine.schema,
    generatedAt:'2026-10-14T10:00:00.000Z',
    headline:{paidOrders:3,totalOrders:6,paidOrderShare:50},
    currencies:[
      {currency:'USD',paidOrders:2,reportingPaidEvents:4,reportingRefundEvents:1,commerceGrossMinor:'10000',reportingGrossMinor:'12000',reportingRefundMinor:'2000',reportingNetMinor:'10000'},
      {currency:'EUR',paidOrders:1,reportingPaidEvents:2,reportingRefundEvents:0,commerceGrossMinor:'5000',reportingGrossMinor:'7000',reportingRefundMinor:'0',reportingNetMinor:'7000'},
    ],
    alerts:[{id:'attribution:unknown',severity:'warning',title:'Unknown attribution'}],
    decisionPlan:{items:[{sourceAlertId:'attribution:unknown',severity:'warning',title:'Fix attribution'}]},
  };
  const current = {
    schema:engine.schema,
    generatedAt:fixedDate,
    headline:{paidOrders:4,totalOrders:7,paidOrderShare:57.14},
    currencies:[
      {currency:'USD',paidOrders:3,reportingPaidEvents:5,reportingRefundEvents:2,commerceGrossMinor:'11000',reportingGrossMinor:'13000',reportingRefundMinor:'2000',reportingNetMinor:'11000'},
      {currency:'JPY',paidOrders:1,reportingPaidEvents:1,reportingRefundEvents:0,commerceGrossMinor:'1200',reportingGrossMinor:'1200',reportingRefundMinor:'0',reportingNetMinor:'1200'},
    ],
    alerts:[
      {id:'attribution:unknown',severity:'critical',title:'Unknown attribution changed'},
      {id:'analytics:empty',severity:'info',title:'No consented events'},
    ],
    decisionPlan:{items:[
      {sourceAlertId:'attribution:unknown',severity:'critical',title:'Fix attribution'},
      {sourceAlertId:'analytics:empty',severity:'info',title:'Check event delivery'},
    ]},
  };
  const comparison = engine.compareReports(previous,current);
  assert.equal(comparison.schema,'osgard.commerce-report-comparison.v1');
  assert.equal(comparison.currentIsNewer,true);
  assert.equal(comparison.metrics[0].delta,1);
  assert.equal(comparison.metrics[2].delta,7.14);
  const usd=comparison.currencies.find(row=>row.currency==='USD');
  assert.equal(usd.presence,'compared');
  assert.equal(usd.counts.paidOrders.delta,1);
  assert.equal(usd.amountsMinor.commerceGrossMinor.delta,'1000');
  const eur=comparison.currencies.find(row=>row.currency==='EUR');
  assert.equal(eur.presence,'not-in-current');
  assert.equal(eur.amountsMinor.commerceGrossMinor.delta,null,'missing currencies must not be treated as zero');
  assert.equal(comparison.currencies.find(row=>row.currency==='JPY').presence,'new');
  assert.equal(comparison.summary.newAlerts,1);
  assert.equal(comparison.summary.changedAlerts,1);
  assert.equal(comparison.summary.newActions,1);
  assert.equal(comparison.summary.changedActions,1);
  assert.ok(!Object.prototype.hasOwnProperty.call(comparison,'totalRevenueMinor'));
});

test('comparison import strictly validates aggregate shape and CSV neutralizes hostile labels', () => {
  const base = {
    schema:engine.schema,
    generatedAt:fixedDate,
    headline:{paidOrders:1,totalOrders:1,paidOrderShare:100},
    currencies:[{currency:'USD',paidOrders:1,reportingPaidEvents:1,reportingRefundEvents:0,commerceGrossMinor:'100',reportingGrossMinor:'100',reportingRefundMinor:'0',reportingNetMinor:'100'}],
    alerts:[{id:'=HYPERLINK("bad")',severity:'warning',title:'@SUM(1,1)'}],
    decisionPlan:{items:[{sourceAlertId:'=HYPERLINK("bad")',severity:'warning',title:'@SUM(1,1)'}]},
  };
  assert.throws(()=>engine.compareReports({...base,schema:'wrong'},base),/поддерживаемым агрегированным отчётом/i);
  assert.throws(()=>engine.compareReports({...base,currencies:[...base.currencies,{...base.currencies[0]}]},base),/уникальными/i);
  const comparison=engine.compareReports(
    {...base,alerts:[],decisionPlan:{items:[]}},
    {...base,generatedAt:'2026-10-16T00:00:00.000Z'}
  );
  const csv=engine.toComparisonCsv(comparison);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(!csv.includes('email'));
});


test('data quality ledger labels measured, partial and unavailable sources without a fake confidence score', () => {
  const report=engine.derive(fixture(),fixedDate);
  const quality=report.dataQuality;
  assert.equal(quality.schema,'osgard.commerce-data-quality.v1');
  assert.equal(quality.state,'limited');
  assert.equal(quality.summary.totalSources,7);
  assert.ok(quality.summary.measured>=5);
  assert.equal(quality.comparability.mixedCurrencyTotals,false);
  assert.equal(quality.comparability.synchronizedCohortsAvailable,false);
  assert.equal(quality.comparability.uniquePeopleAvailable,false);
  assert.equal(quality.comparability.causalityProven,false);
  assert.equal(quality.comparability.financialAudit,false);
  const orders=quality.sources.find(source=>source.id==='commerce-order-ledger');
  const services=quality.sources.find(source=>source.id==='service-reporting-ledger');
  const analytics=quality.sources.find(source=>source.id==='consented-analytics');
  const leads=quality.sources.find(source=>source.id==='lead-attribution');
  assert.equal(orders.status,'measured');
  assert.match(orders.window,/Накопительное/);
  assert.equal(services.status,'measured');
  assert.match(services.window,/30 дней/);
  assert.equal(analytics.status,'measured');
  assert.equal(leads.status,'unavailable');
  assert.ok(quality.caveats.some(note=>note.includes('90 дней')));
  assert.ok(quality.caveats.some(note=>note.includes('не ноль')));
  assert.ok(!Object.prototype.hasOwnProperty.call(quality,'confidencePercent'));
  const csv=engine.toCsv(report);
  assert.ok(csv.includes('"data-quality-source"'));
  assert.ok(csv.includes('"lead-attribution"'));
  const markdown=engine.toMarkdown(report);
  assert.ok(markdown.includes('## Качество и сопоставимость источников'));
  assert.ok(markdown.includes('окно: Накопительное окно доступных записей Commerce API'));
});

test('data quality distinguishes invalid source fields from measured zeros', () => {
  const report=engine.derive(fixture({analyticsFunnel:null,grossPaidByCurrency:null}),fixedDate);
  const quality=report.dataQuality;
  const analytics=quality.sources.find(source=>source.id==='consented-analytics');
  const orders=quality.sources.find(source=>source.id==='commerce-order-ledger');
  assert.equal(analytics.status,'partial','one present analytics field cannot hide the malformed funnel');
  assert.equal(analytics.fields.find(field=>field.key==='analyticsEventsLast30Days').state,'present');
  assert.equal(analytics.fields.find(field=>field.key==='analyticsFunnel').state,'invalid');
  assert.equal(orders.status,'partial');
  assert.equal(orders.fields.find(field=>field.key==='grossPaidByCurrency').state,'invalid');
  assert.ok(quality.summary.partial>=2);
  assert.ok(quality.state==='limited');
  const blocked=engine.derive(null,fixedDate).dataQuality;
  assert.equal(blocked.state,'blocked');
  assert.equal(blocked.summary.blocked,7);
});

function trendReport(generatedAt, currencies, qualityStatus='measured', extras={}) {
  return {
    schema:engine.schema,
    generatedAt,
    headline:{paidOrders:extras.paidOrders ?? 2,totalOrders:4,paidOrderShare:50},
    currencies,
    alerts:extras.alerts||[],
    decisionPlan:extras.actionsAvailable===false?undefined:{items:[]},
    window:{note:'Source periods differ; no synchronized cohort.'},
    dataQuality:{
      schema:'osgard.commerce-data-quality.v1',
      sources:[{id:'commerce-order-ledger',title:extras.qualityTitle||'Orders',status:qualityStatus,window:'Cumulative'}],
    },
  };
}
function trendCurrency(currency, commerceGrossMinor, paidOrders=1) {
  return {currency,paidOrders,reportingPaidEvents:1,reportingRefundEvents:0,
    commerceGrossMinor,reportingGrossMinor:commerceGrossMinor,reportingRefundMinor:'0',reportingNetMinor:commerceGrossMinor};
}

test('Trend Lab builds time-ordered multi-snapshot series and preserves missing currency/action/quality states', () => {
  const reports=[
    trendReport('2026-10-01T10:00:00.000Z',[trendCurrency('USD','10000',2),trendCurrency('EUR','2000',1)],'measured',{paidOrders:2,qualityTitle:'=HYPERLINK("evil")'}),
    trendReport('2026-10-08T10:00:00.000Z',[trendCurrency('USD','12500',3)],'partial',{paidOrders:3,actionsAvailable:false}),
    trendReport('2026-10-15T10:00:00.000Z',[trendCurrency('USD','15000',4),trendCurrency('JPY','4000',1)],'unavailable',{paidOrders:4}),
  ];
  const trend=engine.buildReportTrend(reports);
  assert.equal(trend.schema,'osgard.commerce-report-trend.v1');
  assert.equal(trend.summary.reportCount,3);
  assert.equal(trend.summary.currencyCount,3);
  assert.equal(trend.summary.spanDays,14);
  assert.equal(trend.summary.reportsMissingQuality,0);
  const eur=trend.series.find(item=>item.id==='currency-minor:EUR:commerceGrossMinor');
  assert.ok(eur);
  assert.equal(eur.points[0].value,'2000');
  assert.equal(eur.points[1].value,null);
  assert.equal(eur.points[1].state,'currency-not-reported');
  assert.equal(eur.points[2].value,null,'currency missing from the last snapshot must remain unknown, not zero');
  const actions=trend.series.find(item=>item.id==='actions:count');
  assert.ok(actions);
  assert.equal(actions.points[1].value,null,'a missing plan must not be reported as zero actions');
  assert.equal(actions.points[1].missingReason,'Движок плана отсутствовал в этом отчёте');
  const quality=trend.qualitySeries.find(item=>item.id==='commerce-order-ledger');
  assert.deepEqual(quality.points.map(point=>point.status),['measured','partial','unavailable']);
  assert.ok(trend.series.some(item=>item.id==='headline:paidOrders'));
  const csv=engine.toTrendCsv(trend);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('currency-not-reported'));
  assert.ok(csv.includes('"\'=HYPERLINK(""evil"")"'),'CSV formula injection must be neutralized');
  assert.ok(csv.includes('Source periods differ'));
});

test('Trend Lab validates snapshot count and duplicate timestamps', () => {
  const one=trendReport('2026-10-01T10:00:00.000Z',[trendCurrency('USD','100')]);
  assert.throws(()=>engine.buildReportTrend([one]),/от 2 до 10/i);
  assert.throws(()=>engine.buildReportTrend([one,{...one}]),/одинаковую метку времени/i);
  assert.throws(()=>engine.buildReportTrend(Array.from({length:11},(_,index)=>trendReport('2026-10-'+String(index+1).padStart(2,'0')+'T10:00:00.000Z',[trendCurrency('USD','100')]))),/от 2 до 10/i);
});

test('commerce admin loads the engine and exposes explicit aggregate-only exports', async () => {
  const page=await readFile('public/games/commerce-admin/index.html','utf8');
  assert.ok(page.includes('<script src="/games/commerce-admin/intelligence.js"></script>'));
  for (const marker of [
    'id="premium-command-dashboard"',
    'id="intel-currency-rows"',
    'id="intel-alerts"',
    'id="intel-funnel"',
    'id="intel-promo-rows"',
    'id="intel-export-json"',
    'id="intel-export-csv"',
    'id="intel-plan-actions"',
    'id="intel-plan-summary"',
    'id="intel-export-plan"',
    'id="intel-review-heading"',
    'id="intel-review-items"',
    'id="intel-review-filter"',
    'id="intel-review-query"',
    'id="intel-review-export-json"',
    'id="intel-review-export-csv"',
    'id="intel-review-export-md"',
    'function renderDecisionRegister(report)',
    'engine.buildDecisionRegister(report,stateObject)',
    'engine.normalizeReviewEntry({status:select.value,note:note.value,updatedAt:new Date().toISOString()})',
    'operatorReviewState.clear()',
    'id="intel-quality-heading"',
    'id="intel-quality-summary"',
    'id="intel-quality-sources"',
    'id="intel-quality-caveats"',
    'function renderDataQuality(report)',
    'renderDataQuality(report)',
    'id="intel-compare-file"',
    'id="intel-comparison-currency-rows"',
    'id="intel-comparison-changes"',
    'id="intel-comparison-export-json"',
    'id="intel-comparison-export-csv"',
    'id="intel-trend-files"',
    'id="intel-trend-series"',
    'id="intel-trend-quality-rows"',
    'function renderTrend()',
    'engine.buildReportTrend(trendSnapshots)',
    'window.OSGARDCommerceIntelligence.toTrendCsv(lastTrendReport)',
    'files.length<2||files.length>10',
    'file.size>2*1024*1024',
    'file.size > 2 * 1024 * 1024',
    'normalizeComparisonSnapshot(parsed)',
    'engine.compareReports(comparisonBaseline,lastIntelligenceReport)',
    'window.OSGARDCommerceIntelligence.toComparisonCsv(lastComparisonReport)',
    'window.OSGARDCommerceIntelligence.toMarkdown(lastIntelligenceReport)',
    'window.OSGARDCommerceIntelligence.derive(overview)',
    'window.OSGARDCommerceIntelligence.toCsv(lastIntelligenceReport)',
  ]) assert.ok(page.includes(marker),'missing premium dashboard contract: '+marker);
  assert.ok(!/localStorage|sessionStorage/.test(page),'Commerce admin must not persist operator tokens');
  const compareStart=page.indexOf("$('#intel-compare-file').addEventListener('change'");
  const compareEnd=page.indexOf("$('#load').addEventListener('click',load);");
  assert.ok(compareStart>=0&&compareEnd>compareStart,'Local comparison must have a bounded file-import handler');
  const compareHandler=page.slice(compareStart,compareEnd);
  assert.ok(!/\bfetch\s*\(|sendBeacon|XMLHttpRequest/.test(compareHandler),'The previous JSON snapshot must never be uploaded to a server');
  const trendStart=page.indexOf("$('#intel-trend-files').addEventListener('change'");
  const trendEnd=page.indexOf("$('#intel-trend-clear').addEventListener('click'");
  assert.ok(trendStart>=0&&trendEnd>trendStart,'Trend history must have a bounded local import handler');
  const trendHandler=page.slice(trendStart,trendEnd);
  assert.ok(!/\bfetch\s*\(|sendBeacon|XMLHttpRequest/.test(trendHandler),'Trend JSON must never be uploaded to a server');
  const reviewStart=page.indexOf("$('#intel-review-filter').addEventListener('change'");
  const reviewEnd=page.indexOf("$('#intel-compare-file').addEventListener('change'");
  assert.ok(reviewStart>=0&&reviewEnd>reviewStart,'Decision Ops review handlers must be present');
  const reviewHandler=page.slice(reviewStart,reviewEnd);
  assert.ok(!/\bfetch\s*\(|sendBeacon|XMLHttpRequest/.test(reviewHandler),'Operator reviews must never be uploaded to a server');
  assert.ok(!/localStorage|sessionStorage/.test(reviewHandler),'Operator reviews must stay in memory only');
});

test('Decision Ops review notes validate statuses, timestamps, length and secret-like values', () => {
  const clean=engine.normalizeReviewEntry({status:'investigating',note:'  Проверить\u0000 маршрут  сегодня  ',updatedAt:fixedDate});
  assert.equal(clean.ok,true);
  assert.equal(clean.entry.status,'investigating');
  assert.equal(clean.entry.note,'Проверить маршрут сегодня');
  assert.equal(clean.entry.updatedAt,fixedDate);
  assert.equal(engine.normalizeReviewEntry({status:'closed',note:''}).ok,false);
  assert.equal(engine.normalizeReviewEntry({status:'blocked',note:'x'.repeat(241)}).ok,false);
  assert.equal(engine.normalizeReviewEntry({status:'open',note:'api_key=sk_live_1234567890abcdef'}).ok,false);
  assert.equal(engine.normalizeReviewEntry({status:'open',note:'Bearer abcdefgh'}).ok,false);
  assert.equal(engine.normalizeReviewEntry({status:'open',note:'okay',updatedAt:'not-a-date'}).ok,false);
});
test('Decision Ops register is source-linked and counts human review states', () => {
  const report={generatedAt:fixedDate,decisionPlan:{items:[
    {id:'action:critical',sourceAlertId:'refund:gap',severity:'critical',title:'Сверить возвраты',sourceTitle:'Refund ledger',owner:'Commerce',effort:'small',rationale:'Проверить разницу',steps:['Сверить записи'],automated:false},
    {id:'action:info',sourceAlertId:'sample:small',severity:'info',title:'Накопить выборку',sourceTitle:'Promo ledger',owner:'Growth',effort:'medium',rationale:'Малая выборка',steps:['Накопить показы'],automated:false},
  ]}};
  const state={
    'action:critical':{status:'blocked',note:'Ждём выгрузку',updatedAt:fixedDate},
    'action:info':{status:'checked',note:'Порог проверен',updatedAt:fixedDate},
    'action:not-in-report':{status:'checked',note:'Не должно попасть',updatedAt:fixedDate},
  };
  const register=engine.buildDecisionRegister(report,state);
  assert.equal(register.schema,'osgard.commerce-review-register.v1');
  assert.equal(register.mode,'session-only-read-only');
  assert.equal(register.automationEnabled,false);
  assert.equal(register.sourceGeneratedAt,fixedDate);
  assert.equal(register.summary.total,2);
  assert.equal(register.summary.open,0);
  assert.equal(register.summary.investigating,0);
  assert.equal(register.summary.blocked,1);
  assert.equal(register.summary.checked,1);
  assert.deepEqual(register.items.map(item=>item.id),['action:critical','action:info']);
  assert.equal(register.items[0].sourceTitle,'Refund ledger');
  assert.equal(register.items[0].status,'blocked');
  assert.equal(register.items[1].status,'checked');
  assert.match(register.interpretation,/не означает, что исходный сигнал устранён/);
});
test('Decision Ops exports preserve source context and neutralize spreadsheet formulas', () => {
  const report={generatedAt:fixedDate,decisionPlan:{items:[
    {id:'action:csv',sourceAlertId:'alert:csv',severity:'warning',title:'=HYPERLINK("bad")',sourceTitle:'test source',owner:'Operations',effort:'small',rationale:'Review only',steps:['Check source'],automated:false},
  ]}};
  const state={'action:csv':{status:'investigating',note:'=HYPERLINK("evil")',updatedAt:fixedDate}};
  const register=engine.buildDecisionRegister(report,state);
  const csv=engine.toReviewCsv(register);
  const markdown=engine.toReviewMarkdown(register);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes("'=HYPERLINK"));
  assert.ok(csv.includes('"alert:csv"'));
  assert.ok(csv.includes('"Проверяется"'));
  assert.ok(markdown.startsWith('# OSGARD Premium · реестр проверок\n'));
  assert.ok(markdown.includes('- Заметка оператора: =HYPERLINK("evil")'));
  assert.ok(markdown.endsWith('\n'));
});
test('intelligence engine makes no network calls and does not read browser or user records', () => {
  assert.ok(!/\bfetch\s*\(/.test(engineSource));
  assert.ok(!/\b(localStorage|sessionStorage|document\.cookie)\b/.test(engineSource));
  assert.ok(!/email|order_id|payment_intent|authorization|customer_email/i.test(engineSource));
});
