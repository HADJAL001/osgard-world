const SEMVER = /^\d+\.\d+\.\d+$/;

export function resolveIosMarketingVersion(env = process.env) {
  const tag = String(env.CM_TAG ?? "").trim();
  const override = String(env.APP_VERSION ?? "").trim();
  const tagMatch = /^osgard-play-v(\d+\.\d+\.\d+)$/.exec(tag);

  if (tag && !tagMatch) {
    throw new Error('Invalid OSGARD PLAY release tag "' + tag + '". Expected osgard-play-vX.Y.Z.');
  }
  if (override && !SEMVER.test(override)) {
    throw new Error('APP_VERSION must use numeric X.Y.Z format, for example 1.0.1.');
  }
  if (tagMatch && override && tagMatch[1] !== override) {
    throw new Error('APP_VERSION ' + override + ' does not match the release tag version ' + tagMatch[1] + '.');
  }

  return tagMatch?.[1] || override || "1.0.0";
}

export function resolveIosBuildNumber(env = process.env) {
  const raw = String(env.BUILD_NUMBER ?? "1").trim();
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error('BUILD_NUMBER must be a positive integer; received "' + raw + '".');
  }
  return raw;
}
