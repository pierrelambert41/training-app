/**
 * Tonnage = Σ (charge réelle × reps) des sets complétés. Tout en kg canonique.
 *
 * Métrique de SUIVI uniquement (évolution à séance identique) — le moteur de
 * progression continue de raisonner en séries/charge/RIR par muscle
 * (doctrine volume-first, voir business-rules).
 *
 * - weight_reps : load × reps
 * - bodyweight_reps : (poids du corps × bodyweight_factor + lest) × reps
 *   (lest négatif = traction assistée). bodyweight_factor NULL = 1.0 par
 *   convention (exos en suspension). Sans pesée connue : lest seul, flaggé.
 * - duration / distance_duration : exclus.
 */
import type { Exercise, SetLog } from '@/types';

export type SetTonnageInput = {
  logType: Exercise['logType'];
  load: number | null;
  reps: number | null;
  completed: boolean;
  bodyweightFactor: number | null;
};

export type SessionTonnage = {
  /** Tonnage total en kg, arrondi à l'entier. */
  totalKg: number;
  /** true si des exos bodyweight ont été comptés sans pesée connue (tonnage sous-estimé). */
  missingBodyweight: boolean;
};

/** Tonnage d'un set (kg). Retourne aussi si le poids du corps manquait. */
export function setTonnageKg(
  input: SetTonnageInput,
  bodyWeightKg: number | null
): { kg: number; missingBodyweight: boolean } {
  if (!input.completed || input.reps === null || input.reps <= 0) {
    return { kg: 0, missingBodyweight: false };
  }
  if (input.logType === 'weight_reps') {
    return { kg: (input.load ?? 0) * input.reps, missingBodyweight: false };
  }
  if (input.logType === 'bodyweight_reps') {
    const factor = input.bodyweightFactor ?? 1;
    if (bodyWeightKg === null) {
      return { kg: (input.load ?? 0) * input.reps, missingBodyweight: true };
    }
    return {
      kg: (bodyWeightKg * factor + (input.load ?? 0)) * input.reps,
      missingBodyweight: false,
    };
  }
  return { kg: 0, missingBodyweight: false };
}

export function computeSessionTonnage(
  setLogs: SetLog[],
  exercisesById: Map<string, Exercise>,
  bodyWeightKg: number | null
): SessionTonnage {
  let total = 0;
  let missing = false;

  for (const sl of setLogs) {
    const exercise = exercisesById.get(sl.exerciseId);
    const { kg, missingBodyweight } = setTonnageKg(
      {
        logType: exercise?.logType ?? 'weight_reps',
        load: sl.load,
        reps: sl.reps,
        completed: sl.completed,
        bodyweightFactor: exercise?.bodyweightFactor ?? null,
      },
      bodyWeightKg
    );
    total += kg;
    if (missingBodyweight) missing = true;
  }

  return { totalKg: Math.round(total), missingBodyweight: missing };
}
