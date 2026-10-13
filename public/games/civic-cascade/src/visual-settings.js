/**
 * Pure visual-quality policy shared by the game and automated checks.
 * Quality is a multiplier for dynamic effects / pixel density; it is not a promise
 * of a particular FPS, which can only be measured on the device running the game.
 */
export const QUALITY_FACTORS = Object.freeze({
  auto: 1,
  cinematic: 1,
  balanced: 0.82,
  performance: 0.58,
});

export const QUALITY_LABELS = Object.freeze({
  auto: 'АВТО',
  cinematic: 'КИНО',
  balanced: 'БАЛАНС',
  performance: 'ЭКО',
});

export const QUALITY_NAMES = Object.freeze({
  auto: 'Автоматический',
  cinematic: 'Кинематографический',
  balanced: 'Сбалансированный',
  performance: 'Производительность',
});

export function normalizeQualityMode(mode) {
  return Object.hasOwn(QUALITY_FACTORS, mode) ? mode : 'auto';
}

export function getEffectiveQuality(mode, adaptiveQuality = 1) {
  const normalizedMode = normalizeQualityMode(mode);
  const adaptive = Number.isFinite(adaptiveQuality)
    ? Math.max(0.25, Math.min(1, adaptiveQuality))
    : 1;
  return Math.min(QUALITY_FACTORS[normalizedMode], adaptive);
}

export function getStaticCacheScale(mode, effectiveQuality, defaultScale = 2) {
  const normalizedMode = normalizeQualityMode(mode);
  const requested = normalizedMode === 'cinematic' ? 2.5
    : normalizedMode === 'balanced' ? 1.7
      : normalizedMode === 'performance' ? 1.1
        : defaultScale;
  const quality = Number.isFinite(effectiveQuality) ? effectiveQuality : 1;
  const adaptiveCap = quality < 0.62 ? 1.1 : quality < 0.86 ? 1.5 : requested;
  return Math.min(requested, adaptiveCap);
}

export function shouldReduceMotion(userChoice, systemChoice) {
  return userChoice === true || systemChoice === true;
}