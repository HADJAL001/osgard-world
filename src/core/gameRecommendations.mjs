const CURATED_RELATED_IDS = Object.freeze({
  time: ['civic-cascade', 'inherit', 'cascade-lab'],
  swarm: ['null-shift', 'signal-run', 'remix'],
  'null-shift': ['swarm', 'afterimage-run', 'civic-cascade'],
  inherit: ['patina', 'time', 'cascade-lab'],
  remix: ['cascade-lab', 'swarm', 'afterimage-run'],
  'signal-run': ['afterimage-run', 'cascade-lab', 'swarm'],
  'civic-cascade': ['time', 'null-shift', 'inherit'],
  patina: ['inherit', 'cascade-lab', 'civic-cascade'],
  'cascade-lab': ['signal-run', 'afterimage-run', 'remix'],
  'afterimage-run': ['signal-run', 'cascade-lab', 'null-shift'],
  'aether-grid': ['signal-run', 'cascade-lab', 'patina'],
  'heist-echo': ['null-shift', 'remix', 'cascade-lab'],
});

const asStringSet = value => new Set(
  Array.isArray(value) ? value.filter(item => typeof item === 'string') : [],
);

/**
 * Ranks local, contextual recommendations without sending preferences anywhere.
 * The curated connections define relevance; favorites can lift a familiar game,
 * while recently opened games are gently deprioritized to encourage discovery.
 */
export function getRelatedGames(current, games, preferences = {}, limit = 3) {
  if (!current || typeof current.id !== 'string' || !Array.isArray(games)) return [];
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.min(5, Math.floor(limit))) : 3;
  if (safeLimit === 0) return [];

  const favorites = asStringSet(preferences.favorites);
  const recent = asStringSet(preferences.recent);
  const curated = CURATED_RELATED_IDS[current.id] ?? [];
  const curatedRank = new Map(curated.map((id, index) => [id, index]));
  const seen = new Set();

  return games
    .filter(game => {
      if (!game || typeof game.id !== 'string' || game.id === current.id || seen.has(game.id)) return false;
      seen.add(game.id);
      return true;
    })
    .map((game, index) => {
      const indexInCurated = curatedRank.has(game.id) ? curatedRank.get(game.id) : -1;
      const isFavorite = favorites.has(game.id);
      const wasRecent = recent.has(game.id);
      const sameCategory = typeof current.category === 'string' &&
        typeof game.category === 'string' &&
        current.category === game.category;

      let score = indexInCurated >= 0 ? 100 - indexInCurated * 12 : sameCategory ? 52 : 28;
      if (isFavorite) score += 55;
      if (wasRecent && !isFavorite) score -= 35;

      const reason = isFavorite
        ? 'favorite'
        : indexInCurated >= 0
          ? 'curated'
          : sameCategory
            ? 'genre'
            : 'discover';

      return { game, reason, score, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, safeLimit)
    .map(({ game, reason }) => ({ game, reason }));
}
