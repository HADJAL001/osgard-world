import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLeadMessage, normalizeLeadAttribution, resolvePublicApiBase } from '../src/core/projectIntake.mjs';

const read = path => readFileSync(path, 'utf8');
let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log('PASS ' + String(passed).padStart(2, '0') + ' · ' + name);
}

check('default attribution is first-party and bounded', () => {
  assert.deepEqual(normalizeLeadAttribution(''), {
    gameId: 'unknown', source: 'development_page', campaign: 'project_intake',
  });
});
check('valid game and UTM tags remain traceable', () => {
  assert.deepEqual(normalizeLeadAttribution('?game_id=afterimage-run&utm_source=OSGARD_GAMES&utm_campaign=project_intake'), {
    gameId: 'afterimage-run', source: 'osgard_games', campaign: 'project_intake',
  });
});
check('external URLs cannot be smuggled into attribution slugs', () => {
  assert.deepEqual(normalizeLeadAttribution('?game=https%3A%2F%2Fevil.test&utm_source=https%3A%2F%2Fevil.test&utm_campaign=bad%20campaign'), {
    gameId: 'unknown', source: 'direct', campaign: '',
  });
});
check('unknown game IDs are not retained', () => {
  assert.equal(normalizeLeadAttribution('?game_id=../../remix').gameId, 'unknown');
});
check('empty API configuration fails closed', () => {
  assert.equal(resolvePublicApiBase('', 'https://osgard.world'), '');
});
check('same-origin Commerce API prefix is allowed', () => {
  assert.equal(resolvePublicApiBase('/commerce-api', 'https://osgard.world'), 'https://osgard.world/commerce-api');
});
check('explicit HTTPS service base is accepted', () => {
  assert.equal(resolvePublicApiBase('https://commerce.example.test/', 'https://osgard.world'), 'https://commerce.example.test');
});
check('remote plaintext HTTP is rejected', () => {
  assert.equal(resolvePublicApiBase('http://commerce.example.test', 'https://osgard.world'), '');
});
check('credentials and query parameters are rejected', () => {
  assert.equal(resolvePublicApiBase('https://user:pass@commerce.example.test', 'https://osgard.world'), '');
  assert.equal(resolvePublicApiBase('https://commerce.example.test/?token=secret', 'https://osgard.world'), '');
});
check('unapproved API path is rejected', () => {
  assert.equal(resolvePublicApiBase('https://commerce.example.test/api/v1', 'https://osgard.world'), '');
  assert.equal(resolvePublicApiBase('https://evil.example/commerce-api', 'https://osgard.world'), '');
});
check('fallback message is understandable and bounded', () => {
  const message = buildLeadMessage({
    projectType: 'Разработка игры',
    budget: 'До 50 000 ₽',
    contact: 'demo@example.test',
    description: 'Нужно собрать мобильный прототип',
    attribution: { gameId: 'cascade-lab', source: 'osgard_games', campaign: 'project_intake' },
  });
  assert.ok(message.includes('Разработка игры'));
  assert.ok(message.includes('demo@example.test'));
  assert.ok(message.includes('cascade-lab'));
  assert.ok(message.length <= 4200);
});
const intake = read('src/ProjectIntake.tsx');
const development = read('src/Development.tsx');
const styles = read('src/project-intake.css');
const helper = read('src/core/projectIntake.mjs');
const core = read('services/osgard-commerce-api/src/core.mjs');
const server = read('services/osgard-commerce-api/src/server.mjs');
const admin = read('public/games/commerce-admin/index.html');
const config = JSON.parse(read('public/games/commerce-config.json'));

check('development route embeds intake before the portfolio', () => {
  assert.ok(development.includes("import { ProjectIntake } from './ProjectIntake'"));
  assert.ok(development.includes('<ProjectIntake locale={locale} botUrl={botUrl} />'));
  assert.ok(development.includes('href="#project-intake"'));
});
check('form requires explicit processing acknowledgement and uses honeypot', () => {
  assert.ok(intake.includes('required />'));
  assert.ok(intake.includes('consent: true'));
  assert.ok(intake.includes('name="website"'));
  assert.ok(intake.includes('DATA_PROCESSING_ACK_REQUIRED') || core.includes('DATA_PROCESSING_ACK_REQUIRED'));
});
check('API endpoint is used only when explicitly configured', () => {
  assert.ok(intake.includes("fetch('/games/commerce-config.json'"));
  assert.ok(intake.includes("apiBase + '/v1/leads'"));
  assert.ok(intake.includes('if (!apiBase)'));
  assert.equal(config.apiBaseUrl, '');
});
check('fallback requires a user click and offers WhatsApp/email', () => {
  assert.ok(intake.includes('https://wa.me/79640027222?text='));
  assert.ok(intake.includes('mailto:osman.osmanov0099@gmail.com?subject='));
  assert.ok(intake.includes('откроется внешний канал'));
});
check('attribution helper never accepts arbitrary campaign URLs', () => {
  assert.ok(helper.includes('ATTRIBUTION_SLUG'));
  assert.ok(helper.includes("return base.origin +"));
});
check('server validates and stores attribution with the lead', () => {
  assert.ok(core.includes('attribution: normalizeCheckoutAttribution(input.attribution)'));
  assert.ok(server.includes('ALTER TABLE commerce_leads ADD COLUMN IF NOT EXISTS attribution_game_id'));
  assert.ok(server.includes('attribution_source TEXT NOT NULL DEFAULT'));
  assert.ok(server.includes('lead.attribution.gameId'));
  assert.ok(server.includes('lead.attribution.source'));
});
check('lead attribution aggregates are protected and exposed for the admin', () => {
  assert.ok(server.includes('leadsByAttribution: leadAttributionStats.rows'));
  assert.ok(server.includes('app.get("/v1/admin/overview", requireAdmin'));
  assert.ok(server.includes('attribution_game_id AS "gameId"'));
  assert.ok(admin.includes('leadsByAttribution'));
});
check('intake form is responsive and honors reduced motion', () => {
  assert.ok(styles.includes('@media(max-width:560px)'));
  assert.ok(styles.includes('prefers-reduced-motion:reduce'));
  assert.ok(styles.includes(':focus-visible'));
});
console.log('PASS PROJECT INTAKE CONTRACT: ' + passed + '/19 checks.');
