/**
 * Recommendation — recommandation du moteur de progression (Phase 5).
 *
 * Source de vérité : docs/data-model.md §Recommendation.
 * Côté local SQLite : metadata stocké en TEXT (JSON sérialisé).
 * Côté Supabase : metadata en JSONB natif.
 */

export type RecommendationType =
  | 'load_change'
  | 'deload'
  | 'plateau'
  | 'fatigue_alert'
  | 'summary';

export type RecommendationAction =
  | 'increase'
  | 'maintain'
  | 'decrease'
  | 'deload'
  | 'replace';

export type RecommendationSource = 'rules_engine' | 'ai';

export interface Recommendation {
  id: string;
  sessionId: string;
  /** Null si recommandation de niveau séance (ex: deload global). */
  exerciseId: string | null;
  source: RecommendationSource;
  type: RecommendationType;
  message: string;
  /** Charge cible pour la prochaine séance. Null si reco globale. */
  nextLoad: number | null;
  /** Nombre de reps cible. Null si reco globale. */
  nextRepTarget: number | null;
  /** RIR cible. Null si reco globale. */
  nextRirTarget: number | null;
  action: RecommendationAction | null;
  /** Confiance du moteur entre 0 et 1. */
  confidence: number | null;
  /** Données supplémentaires sérialisées en JSON. */
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type NewRecommendationInput = {
  id: string;
  sessionId: string;
  exerciseId?: string | null;
  source: RecommendationSource;
  type: RecommendationType;
  message: string;
  nextLoad?: number | null;
  nextRepTarget?: number | null;
  nextRirTarget?: number | null;
  action?: RecommendationAction | null;
  confidence?: number | null;
  metadata?: Record<string, unknown>;
};

export type UpdateRecommendationInput = Partial<
  Pick<
    Recommendation,
    | 'message'
    | 'nextLoad'
    | 'nextRepTarget'
    | 'nextRirTarget'
    | 'action'
    | 'confidence'
    | 'metadata'
  >
>;
