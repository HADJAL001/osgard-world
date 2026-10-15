const BUNDLE_RE = /\/assets\/(index-[A-Za-z0-9_-]+\.js)/;

export function extractLiveBundle(html) {
  return typeof html === 'string' ? (html.match(BUNDLE_RE)?.[1] || null) : null;
}

export function extractDocumentedBundle(markdown) {
  if (typeof markdown !== 'string') return null;
  const tick = String.fromCharCode(96);
  const marker = new RegExp('live frontend bundle is ' + tick + '([^' + tick + ']+)' + tick, 'i');
  return markdown.match(marker)?.[1] || null;
}

/**
 * Compare the running site to the freshly-built artifact when available.
 * A documentation marker is only a fallback when no build artifact exists;
 * it must never override the exact bundle in the build under test.
 */
export function auditLiveBundle({ base, liveHtml, documentedMarkdown, builtHtml = null }) {
  const liveBundle = extractLiveBundle(liveHtml);
  const documentedBundle = extractDocumentedBundle(documentedMarkdown);
  const builtBundle = extractLiveBundle(builtHtml);
  const expectedBundle = builtBundle || documentedBundle;
  const expectedSource = builtBundle ? 'current-build' : 'documented-baseline';
  let status = 'ready';
  let reason = 'The live HTML points at the expected frontend bundle.';
  if (!liveBundle) {
    status = 'invalid-live-html';
    reason = 'The live HTML does not expose a Vite index bundle.';
  } else if (!expectedBundle) {
    status = 'missing-expected-bundle';
    reason = 'Neither the local build nor the documentation contains an expected bundle name.';
  } else if (liveBundle !== expectedBundle) {
    status = 'mismatch';
    reason = builtBundle
      ? 'The live production bundle differs from the freshly built release artifact.'
      : 'The live bundle differs from the documented baseline; build the release before treating this as a deployment verdict.';
  }
  return {
    schema: 'osgard.live-bundle-audit.v2',
    base,
    liveBundle,
    expectedBundle,
    expectedSource,
    builtBundle,
    documentedBundle,
    documentedBundleMatches: Boolean(liveBundle && documentedBundle && liveBundle === documentedBundle),
    buildBundleMatches: builtBundle ? liveBundle === builtBundle : null,
    status,
    reason,
  };
}
