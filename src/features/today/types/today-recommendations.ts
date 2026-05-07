import type { Recommendation } from '@/types/recommendation';

/**
 * Statut d'affichage de la séance du jour.
 * Miroir de DisplaySessionStatus (shared-components/session-status-badge).
 * Redéfini ici pour éviter un import de shared-components depuis feature-types.
 */
export type TodaySessionStatus =
  | 'progression'
  | 'maintien'
  | 'allegee'
  | 'deload'
  | 'prudente'
  | 'aggressive';

export interface TodayRecommendations {
  sessionStatus: TodaySessionStatus | null;
  fatigueScore: number | null;
  loadRecommendations: Recommendation[];
  plateauRecommendations: Recommendation[];
  deloadRecommendation: Recommendation | null;
  fatigue_alert: Recommendation | null;
}
