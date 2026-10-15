import assert from 'node:assert/strict';
import { auditLiveBundle, extractDocumentedBundle, extractLiveBundle } from './live-bundle-audit-core.mjs';

const html = (bundle) => '<!doctype html><html><head></head><body><script type="module" crossorigin src="/assets/' + bundle + '"></script></body></html>';
const tick = String.fromCharCode(96);
const docs = (bundle) => '# Audit\n\nThe live frontend bundle is ' + tick + bundle + tick + '.';

assert.equal(extractLiveBundle(html('index-abC_123.js')), 'index-abC_123.js');
assert.equal(extractLiveBundle('<html><body>no asset tag</body></html>'), null);
assert.equal(extractDocumentedBundle(docs('index-doc.js')), 'index-doc.js');

const exactBuild = auditLiveBundle({
  base:'https://osgard.world',
  liveHtml:html('index-current.js'),
  documentedMarkdown:docs('index-old-doc.js'),
  builtHtml:html('index-current.js'),
});
assert.equal(exactBuild.status, 'ready', 'live bundle that matches the built artifact must pass even if the prose marker is stale');
assert.equal(exactBuild.expectedSource, 'current-build');
assert.equal(exactBuild.documentedBundleMatches, false);
assert.equal(exactBuild.buildBundleMatches, true);

const mismatch = auditLiveBundle({
  base:'https://osgard.world',
  liveHtml:html('index-live.js'),
  documentedMarkdown:docs('index-doc.js'),
  builtHtml:html('index-new-build.js'),
});
assert.equal(mismatch.status, 'mismatch');
assert.equal(mismatch.reason, 'The live production bundle differs from the freshly built release artifact.');

const noBuild = auditLiveBundle({
  base:'https://osgard.world',
  liveHtml:html('index-doc.js'),
  documentedMarkdown:docs('index-doc.js'),
});
assert.equal(noBuild.status, 'ready');
assert.equal(noBuild.expectedSource, 'documented-baseline');
assert.equal(noBuild.buildBundleMatches, null);

const invalid = auditLiveBundle({
  base:'https://osgard.world',
  liveHtml:'<html>missing built asset</html>',
  documentedMarkdown:docs('index-doc.js'),
});
assert.equal(invalid.status, 'invalid-live-html');

console.log('PASS live bundle audit: fresh-build precedence, documented fallback, true artifact mismatch and malformed HTML.');
