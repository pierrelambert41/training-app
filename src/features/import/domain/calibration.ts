/**
 * Fonctions pures de calibration des charges initiales.
 *
 * Formule Epley : load * (1 + reps / 30).
 * Source : docs/business-rules.md §7 — même formule que progression-vs-previous.ts.
 * Dupliquée ici car boundaries/dependencies interdit les imports cross-feature
 * (cf. pitfall ARCH-02, TA-104 pattern TA-110).
 */

export type SetSample = {
  load: number;
  reps: number;
};

export function computeE1rm(load: number, reps: number): number {
  return load * (1 + reps / 30);
}

/**
 * Meilleur e1RM parmi tous les sets valides (load > 0, reps > 0).
 * Retourne null si aucun set valide.
 */
export function computeBestE1rm(sets: SetSample[]): number | null {
  const values = sets
    .filter((s) => s.load > 0 && s.reps > 0)
    .map((s) => computeE1rm(s.load, s.reps));

  if (values.length === 0) return null;
  return Math.max(...values);
}

/**
 * Charge moyenne sur les 4 dernières semaines à partir d'une date de référence.
 * `referenceDateIso` par défaut = maintenant (format ISO 8601).
 * Retourne null si aucun set dans la fenêtre ou aucun set valide.
 */
export function computeRecentAvgLoad(
  sets: (SetSample & { sessionDateIso: string })[],
  referenceDateIso?: string
): number | null {
  const refMs = referenceDateIso
    ? new Date(referenceDateIso).getTime()
    : Date.now();

  const fourWeeksMs = 28 * 24 * 60 * 60 * 1000;
  const cutoffMs = refMs - fourWeeksMs;

  const recent = sets.filter((s) => {
    const dateMs = new Date(s.sessionDateIso).getTime();
    return dateMs >= cutoffMs && dateMs <= refMs && s.load > 0;
  });

  if (recent.length === 0) return null;
  const sum = recent.reduce((acc, s) => acc + s.load, 0);
  return sum / recent.length;
}
