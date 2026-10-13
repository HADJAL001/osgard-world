export type RecommendationReason = 'favorite' | 'curated' | 'genre' | 'discover';

export interface RecommendationGame {
  id: string;
  category: string;
}

export interface RecommendationPreferences {
  favorites?: readonly string[];
  recent?: readonly string[];
}

export interface RelatedRecommendation<T extends RecommendationGame = RecommendationGame> {
  game: T;
  reason: RecommendationReason;
}

export declare function getRelatedGames<T extends RecommendationGame>(
  current: T,
  games: readonly T[],
  preferences?: RecommendationPreferences,
  limit?: number,
): RelatedRecommendation<T>[];
