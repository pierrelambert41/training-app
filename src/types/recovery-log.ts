/**
 * RecoveryLog — check-in quotidien de récupération (1 entrée par user/date).
 * Source de vérité : docs/data-model.md §RecoveryLog. Miroir de la table
 * Supabase recovery_logs (TA-148). Résout le pitfall PROG-02 (type global
 * absent — les snapshots locaux de fatigue-score.ts restent les interfaces
 * de consommation).
 */
export interface RecoveryLog {
  id: string;
  userId: string;
  /** Date du jour au format ISO (YYYY-MM-DD). */
  date: string;
  sleepHours: number | null;
  /** Qualité de sommeil déclarée, 1-10. */
  sleepQuality: number | null;
  /** Énergie déclarée, 1-10. */
  energy: number | null;
  stress: number | null;
  motivation: number | null;
  /** Courbatures déclarées, 1-10. */
  soreness: number | null;
  jointPain: number | null;
  restingHr: number | null;
  hrv: number | null;
  weightKg: number | null;
  notes: string | null;
  createdAt: string;
}

/**
 * Champs saisis par la carte "Check-in du jour" (TA-148). Les autres champs
 * de RecoveryLog (HR, HRV, poids…) restent null en attendant leurs UI/imports.
 */
export interface DailyCheckinInput {
  userId: string;
  date: string;
  sleepQuality: number;
  energy: number;
  soreness: number;
  notes?: string | null;
}
