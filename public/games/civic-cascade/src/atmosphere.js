/** Scenario-specific visual treatment. Effects are procedural and remain local to the renderer. */
const PROFILE_BASE = Object.freeze({
  storm: Object.freeze({ mode: 'storm', label: 'ШТОРМ / ЛИВЕНЬ', rain: true, electricity: false, evacuation: false, baseParticles: 104, glow: 0.82, lightning: true }),
  grid: Object.freeze({ mode: 'grid', label: 'ЭНЕРГОСЕТЬ / ДУГИ', rain: false, electricity: true, evacuation: false, baseParticles: 32, glow: 1, lightning: false }),
  evacuation: Object.freeze({ mode: 'evacuation', label: 'ЭВАКУАЦИЯ / СИГНАЛЫ', rain: false, electricity: false, evacuation: true, baseParticles: 48, glow: 0.74, lightning: false }),
});

export function getAtmosphereProfile(scenarioId = 'storm', quality = 1, reducedMotion = false) {
  const base = PROFILE_BASE[scenarioId] || PROFILE_BASE.storm;
  const safeQuality = Number.isFinite(quality) ? Math.max(0.25, Math.min(1, quality)) : 1;
  const still = reducedMotion === true;
  return {
    ...base,
    particleCount: Math.max(still ? 8 : 12, Math.round(base.baseParticles * safeQuality * (still ? 0.42 : 1))),
    glow: base.glow * safeQuality,
    lightning: base.lightning && !still && safeQuality > 0.6,
    motionScale: still ? 0.18 : 1,
    quality: safeQuality,
    reducedMotion: still,
  };
}

export function ambientParticleAt(index, timeSeconds, width, height, mode = 'storm') {
  const seed = (index + 1) * 127.1 + (mode === 'grid' ? 79.7 : mode === 'evacuation' ? 41.9 : 19.3);
  const fract = (value) => value - Math.floor(value);
  const a = fract(Math.sin(seed) * 43758.5453);
  const b = fract(Math.sin(seed * 1.37 + 11.7) * 24634.6345);
  const speed = mode === 'storm' ? 44 + a * 38 : mode === 'grid' ? 7 + a * 19 : 8 + a * 15;
  const verticalTravel = ((b * height + timeSeconds * speed) % (height + 24)) - 12;
  const horizontalTravel = mode === 'storm'
    ? ((a * width - timeSeconds * (7 + b * 10)) % (width + 20) + width + 20) % (width + 20) - 10
    : (a * width + Math.sin(timeSeconds * 0.2 + seed) * (mode === 'grid' ? 2 : 14));
  return {
    x: horizontalTravel,
    y: verticalTravel,
    radius: mode === 'grid' ? 0.7 + a * 1.7 : 0.45 + a * 1.1,
    alpha: 0.08 + b * (mode === 'evacuation' ? 0.14 : 0.1),
    phase: a * Math.PI * 2,
  };
}

export function scenarioAtmosphereStatus(scenarioId = 'storm') {
  return (PROFILE_BASE[scenarioId] || PROFILE_BASE.storm).label;
}