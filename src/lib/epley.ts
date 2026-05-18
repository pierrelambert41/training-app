/**
 * Formule Epley pour l'estimation du 1RM.
 *
 * Source : docs/business-rules.md §7
 * e1RM = load * (1 + reps / 30)
 *
 * Migré en shared-lib (TA-132) car la formule est utilisée par ≥ 3 features
 * (progression, import, ai). Cf. pitfall CALIB-01.
 */
export function computeE1rm(load: number, reps: number): number {
  return load * (1 + reps / 30);
}
