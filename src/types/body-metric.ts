/**
 * BodyMetric — mesure corporelle datée (1 entrée par user/date). Sous-ensemble
 * MVP de la table Supabase body_metrics : seuls le poids et la note sont
 * saisis (TA-153) ; mensurations et photos hors scope.
 */
export interface BodyMetric {
  id: string;
  userId: string;
  /** Date de la pesée (YYYY-MM-DD). */
  date: string;
  weightKg: number | null;
  notes: string | null;
  createdAt: string;
}

export interface BodyWeightInput {
  userId: string;
  date: string;
  weightKg: number;
}
