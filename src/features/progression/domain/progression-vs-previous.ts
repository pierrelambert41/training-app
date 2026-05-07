import type { SetLog } from '@/types/set-log';

/**
 * Calcul du facteur `progressionVsPrevious` pour le score de performance.
 *
 * Source : docs/business-rules.md §5 — composante 4 du score (poids 0.2).
 * Formule e1RM Epley : load * (1 + reps / 30) (cf. §7).
 *
 * Compare le e1RM moyen pondéré (par série complétée) de la séance courante
 * à celui de la séance précédente, par exercice.
 *
 * Pourquoi par exercice : un nouveau exercice (ex: hypertrophie → force)
 * change la base d'e1RM. Comparer globalement biaiserait le résultat. On
 * ne compare donc que les exercices présents dans les deux séances et on
 * moyenne les ratios.
 *
 * Sortie normalisée 0..1 :
 * - 0.5 = pas d'historique exploitable (neutre, équivalent au stub TA-83).
 * - 1.0 = stable (ratio = 1.0). 0 = régression sévère, 1 = progression
 *   complète au plafond. Plafonné à 1.0 (les progressions au-delà ne sont
 *   pas "plus bonnes" pour le score post-séance — elles le saturent déjà).
 *
 * Fonction pure — zéro I/O, zéro store.
 */

const RATIO_TO_SCORE_MIN = 0.7;
const RATIO_TO_SCORE_MAX = 1.1;

function computeE1rm(load: number, reps: number): number {
  return load * (1 + reps / 30);
}

function averageE1rmForExercise(setLogs: SetLog[], exerciseId: string): number | null {
  const values = setLogs
    .filter((s) => s.exerciseId === exerciseId && s.completed)
    .filter(
      (s): s is SetLog & { load: number; reps: number } =>
        s.load !== null && s.reps !== null && s.load > 0 && s.reps > 0,
    )
    .map((s) => computeE1rm(s.load, s.reps));

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Convertit un ratio courant/précédent en score 0..1 pour la formule §5.
 * - ratio <= 0.7 → 0 (régression sévère, plancher).
 * - ratio >= 1.1 → 1 (progression franche, plafond).
 * - linéaire entre les deux.
 */
function ratioToScore(ratio: number): number {
  if (ratio <= RATIO_TO_SCORE_MIN) return 0;
  if (ratio >= RATIO_TO_SCORE_MAX) return 1;
  return (ratio - RATIO_TO_SCORE_MIN) / (RATIO_TO_SCORE_MAX - RATIO_TO_SCORE_MIN);
}

/**
 * Calcule la composante `progressionVsPrevious` (0..1) pour le score de
 * performance d'une séance, à partir des SetLogs de la séance courante et
 * de la séance précédente.
 *
 * @param currentSetLogs - SetLogs de la séance dont on calcule le score.
 * @param previousSetLogs - SetLogs de la séance complétée la plus récente
 *   du même user (toutes séances confondues). null si aucune.
 * @returns score 0..1, 0.5 si insuffisamment de données pour comparer.
 */
export function computeProgressionVsPrevious(
  currentSetLogs: SetLog[],
  previousSetLogs: SetLog[] | null,
): number {
  if (previousSetLogs === null || previousSetLogs.length === 0) return 0.5;

  const currentExerciseIds = new Set(
    currentSetLogs.filter((s) => s.completed).map((s) => s.exerciseId),
  );
  const previousExerciseIds = new Set(
    previousSetLogs.filter((s) => s.completed).map((s) => s.exerciseId),
  );
  const sharedExercises = [...currentExerciseIds].filter((id) =>
    previousExerciseIds.has(id),
  );

  if (sharedExercises.length === 0) return 0.5;

  const ratios: number[] = [];
  for (const exerciseId of sharedExercises) {
    const currentE1rm = averageE1rmForExercise(currentSetLogs, exerciseId);
    const previousE1rm = averageE1rmForExercise(previousSetLogs, exerciseId);
    if (currentE1rm === null || previousE1rm === null || previousE1rm === 0) {
      continue;
    }
    ratios.push(currentE1rm / previousE1rm);
  }

  if (ratios.length === 0) return 0.5;

  const meanRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  return ratioToScore(meanRatio);
}
