import type { SetLog } from '@/types/set-log';

/**
 * Snapshot d'une séance pour un exercice donné.
 * Regroupe les SetLogs d'une séance avec le fatigueScore associé.
 *
 * Le fatigueScore provient de la session parente (calculé via computeFatigueScore).
 * Le champ `sessionDate` permet d'ordonner les séances chronologiquement.
 */
export interface ExerciseSession {
  sessionId: string;
  sessionDate: string;
  fatigueScore: number;
  setLogs: SetLog[];
}

/**
 * Types de recommandations pour un plateau.
 * Ordonnés selon docs/business-rules.md §6 (ordre d'escalade).
 */
export type PlateauRecommendationType =
  | 'check_technique'
  | 'suggest_variant'
  | 'adjust_rep_range'
  | 'modify_tempo'
  | 'replace';

export interface PlateauRecommendation {
  type: PlateauRecommendationType;
  message: string;
}

/**
 * Résultat de l'analyse de plateau pour un exercice.
 */
export interface PlateauAnalysis {
  exerciseId: string;
  sessionsInPlateau: number;
  recommendations: PlateauRecommendation[];
}

/**
 * Tolérance de charge pour considérer deux charges comme identiques.
 * Source : spec TA-107 ("charge identique arrondi à 0.25 kg près").
 */
const LOAD_TOLERANCE_KG = 0.25;

/**
 * Nombre minimum de séances pour détecter un plateau.
 * Source : docs/business-rules.md §6.
 */
const MIN_SESSIONS_FOR_PLATEAU = 3;

/**
 * Seuil de fatigueScore au-delà duquel le plateau n'est pas confirmé.
 * Source : docs/business-rules.md §6 ("pas de facteur fatigue évident").
 */
const FATIGUE_THRESHOLD = 6;

/**
 * Seuil de RIR en dessous duquel le plateau n'est pas confirmé.
 * Source : docs/business-rules.md §6 ("pas de progression malgré RIR >= 2").
 */
const RIR_THRESHOLD = 2;

/**
 * Nombre de séances en plateau à partir duquel on recommande le remplacement.
 * Source : docs/business-rules.md §6 ("Si plateau persistant (6+ séances)").
 */
const REPLACEMENT_THRESHOLD = 6;

/**
 * Calcule la charge médiane d'une session (arrondie à LOAD_TOLERANCE_KG).
 * Retourne null si aucun set n'a de charge.
 */
function sessionMedianLoad(setLogs: SetLog[]): number | null {
  const loads = setLogs
    .map((s) => s.load)
    .filter((l): l is number => l !== null);

  if (loads.length === 0) return null;

  const sorted = [...loads].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 0
      ? ((sorted[mid - 1]! + sorted[mid]!) / 2)
      : sorted[mid]!;

  return Math.round(median / LOAD_TOLERANCE_KG) * LOAD_TOLERANCE_KG;
}

/**
 * Calcule le nombre de reps moyen d'une session (arrondi à l'entier).
 * Retourne null si aucun set n'a de reps.
 */
function sessionAverageReps(setLogs: SetLog[]): number | null {
  const reps = setLogs
    .map((s) => s.reps)
    .filter((r): r is number => r !== null);

  if (reps.length === 0) return null;

  return Math.round(reps.reduce((acc, r) => acc + r, 0) / reps.length);
}

/**
 * Calcule le RIR moyen d'une session.
 * Retourne null si aucun set n'a de RIR.
 */
function sessionAverageRir(setLogs: SetLog[]): number | null {
  const rirs = setLogs
    .map((s) => s.rir)
    .filter((r): r is number => r !== null);

  if (rirs.length === 0) return null;

  return rirs.reduce((acc, r) => acc + r, 0) / rirs.length;
}

/**
 * Construit les recommandations de plateau selon le nombre de séances en plateau.
 * Source : docs/business-rules.md §6 (ordre imposé).
 */
function buildRecommendations(sessionsInPlateau: number): PlateauRecommendation[] {
  const recommendations: PlateauRecommendation[] = [
    {
      type: 'check_technique',
      message:
        "Verifier la technique d'execution : une mauvaise execution peut bloquer la progression.",
    },
    {
      type: 'suggest_variant',
      message:
        "Essayer une variante de l'exercice pour stimuler differemment le groupe musculaire.",
    },
    {
      type: 'adjust_rep_range',
      message:
        'Ajuster la fourchette de repetitions pour relancer la progression (ex : passer de 3x8 a 3x6).',
    },
    {
      type: 'modify_tempo',
      message:
        "Modifier le tempo d'execution (ex : ajouter une phase excentrique lente) pour augmenter le stimulus.",
    },
  ];

  if (sessionsInPlateau >= REPLACEMENT_THRESHOLD) {
    recommendations.push({
      type: 'replace',
      message:
        `Plateau persistant depuis ${sessionsInPlateau} séances : envisager de remplacer l'exercice par un exercice équivalent.`,
    });
  }

  return recommendations;
}

/**
 * Détecte si un exercice est en plateau à partir de l'historique de ses sessions.
 *
 * Conditions de plateau (toutes requises, docs/business-rules.md §6) :
 * - charge identique depuis 3+ séances (tolérance ±0.25 kg)
 * - reps identiques depuis 3+ séances
 * - RIR moyen >= 2 (conditions favorables à la progression)
 * - fatigueScore < 6 (pas de fatigue évidente masquant la progression)
 *
 * Retourne null si :
 * - moins de 3 sessions disponibles
 * - la charge ou les reps varient entre les sessions
 * - la fatigue est élevée (score >= 6)
 * - le RIR est trop bas (< 2) pour valider les conditions favorables
 *
 * Fonction pure — zéro I/O, zéro store.
 *
 * @param exerciseHistory - Sessions ordonnées chronologiquement pour un exercice
 * @returns PlateauAnalysis si plateau détecté, null sinon
 */
export function detectPlateau(exerciseHistory: ExerciseSession[]): PlateauAnalysis | null {
  if (exerciseHistory.length < MIN_SESSIONS_FOR_PLATEAU) return null;

  const sorted = [...exerciseHistory].sort(
    (a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime(),
  );

  const recent = sorted.slice(-MIN_SESSIONS_FOR_PLATEAU);

  // Vérification fatigue : aucune des séances récentes ne doit dépasser le seuil
  const hasHighFatigue = recent.some((s) => s.fatigueScore >= FATIGUE_THRESHOLD);
  if (hasHighFatigue) return null;

  // Vérification charges identiques
  const loads = recent.map((s) => sessionMedianLoad(s.setLogs));
  if (loads.some((l) => l === null)) return null;

  const referenceLoad = loads[0]!;
  const loadsIdentical = loads.every(
    (l) => Math.abs(l! - referenceLoad) < LOAD_TOLERANCE_KG / 2,
  );
  if (!loadsIdentical) return null;

  // Vérification reps identiques
  const reps = recent.map((s) => sessionAverageReps(s.setLogs));
  if (reps.some((r) => r === null)) return null;

  const referenceReps = reps[0]!;
  const repsIdentical = reps.every((r) => r === referenceReps);
  if (!repsIdentical) return null;

  // Vérification RIR >= 2 (conditions favorables : l'utilisateur avait de la marge)
  const ririValues = recent.map((s) => sessionAverageRir(s.setLogs));
  if (ririValues.some((r) => r === null)) return null;

  const avgRir = ririValues.reduce((acc: number, r) => acc + r!, 0) / ririValues.length;
  if (avgRir < RIR_THRESHOLD) return null;

  // Plateau confirmé — on compte toutes les séances consecutives en plateau
  // (pas seulement les 3 dernières) pour savoir si on doit recommander replace
  const sessionsInPlateau = countConsecutivePlateauSessions(sorted);

  // Récupérer l'exerciseId depuis les SetLogs (identique pour toute la session).
  // À ce point : recent est non-vide (slice de MIN_SESSIONS_FOR_PLATEAU) et
  // loads/reps ont tous passé la vérification null → setLogs est garanti non-vide.
  const exerciseId = recent[0]!.setLogs[0]!.exerciseId;

  return {
    exerciseId,
    sessionsInPlateau,
    recommendations: buildRecommendations(sessionsInPlateau),
  };
}

/**
 * Compte le nombre de séances consécutives en plateau depuis la fin de l'historique.
 * Une séance est "en plateau" si sa charge et ses reps sont identiques à la première
 * séance de la séquence de plateau détectée.
 *
 * On part de la fin de l'historique et on remonte jusqu'à trouver une discontinuité.
 */
function countConsecutivePlateauSessions(
  sortedHistory: ExerciseSession[],
): number {
  if (sortedHistory.length === 0) return 0;

  const lastIndex = sortedHistory.length - 1;
  const lastLoad = sessionMedianLoad(sortedHistory[lastIndex]!.setLogs);
  const lastReps = sessionAverageReps(sortedHistory[lastIndex]!.setLogs);

  if (lastLoad === null || lastReps === null) return 1;

  let count = 1;
  for (let i = lastIndex - 1; i >= 0; i--) {
    const session = sortedHistory[i]!;
    const load = sessionMedianLoad(session.setLogs);
    const repsVal = sessionAverageReps(session.setLogs);

    if (
      load === null ||
      repsVal === null ||
      Math.abs(load - lastLoad) >= LOAD_TOLERANCE_KG / 2 ||
      repsVal !== lastReps
    ) {
      break;
    }
    count++;
  }

  return count;
}
