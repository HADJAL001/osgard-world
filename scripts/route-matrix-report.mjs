function boundedText(value, limit = 300) {
  if (typeof value !== 'string') return undefined;
  return value.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

/**
 * Produce a compact, safe diagnostic view of a failed production route matrix.
 * The raw matrix remains in the artifact for full review.
 */
export function summarizeRouteFailures(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter(row => row && row.ok === false).map(row => {
    const failedAssets = (Array.isArray(row.assets) ? row.assets : [])
      .filter(asset => asset && asset.ok === false)
      .map(asset => ({
        path: boundedText(asset.path, 220) || 'unknown',
        status: Number.isInteger(asset.status) ? asset.status : 0,
        expectedType: boundedText(asset.expectedType, 40) || 'unknown',
        contentType: boundedText(asset.contentType, 100) || '',
        typeOk: asset.typeOk === true,
        nonEmpty: asset.nonEmpty === true,
      }));
    const checks = row.checks && typeof row.checks === 'object' ? row.checks : {};
    const reasons = [];
    if (Number(row.status) !== 200) reasons.push('unexpected_http_status');
    if (checks.shellOk === false) reasons.push('page_contract_failed');
    if (row.build && row.build.matches === false) reasons.push('build_revision_mismatch');
    if (checks.assetsOk === false || failedAssets.length) reasons.push('asset_contract_failed');
    if (row.error) reasons.push('request_failed');
    if (!reasons.length) reasons.push('other_contract_failed');
    return {
      device: boundedText(row.device, 32) || 'unknown',
      route: boundedText(row.route, 220) || 'unknown',
      status: Number.isInteger(row.status) ? row.status : 0,
      durationMs: Number.isFinite(row.durationMs) ? Math.max(0, Math.round(row.durationMs)) : null,
      reasons: [...new Set(reasons)],
      ...(row.build && row.build.matches === false ? {
        build: {
          expected: boundedText(row.build.expected, 40) || null,
          actual: boundedText(row.build.actual, 40) || null,
        },
      } : {}),
      ...(row.error ? { error: boundedText(String(row.error), 600) } : {}),
      failedAssets,
    };
  });
}
