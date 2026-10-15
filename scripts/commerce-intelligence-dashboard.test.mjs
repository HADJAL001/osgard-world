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
    'window.OSGARDCommerceIntelligence.toMarkdown(lastIntelligenceReport)',
    'window.OSGARDCommerceIntelligence.derive(overview)',
    'window.OSGARDCommerceIntelligence.toCsv(lastIntelligenceReport)',
  ]) assert.ok(page.includes(marker),'missing premium dashboard contract: '+marker);
  assert.ok(!/localStorage|sessionStorage/.test(page),'Commerce admin must not persist operator tokens');
});

test('intelligence engine makes no network calls and does not read browser or user records', () => {
  assert.ok(!/\bfetch\s*\(/.test(engineSource));
  assert.ok(!/\b(localStorage|sessionStorage|document\.cookie)\b/.test(engineSource));
  assert.ok(!/email|order_id|payment_intent|authorization|customer_email/i.test(engineSource));
});
