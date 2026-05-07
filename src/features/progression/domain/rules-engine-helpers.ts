/**
 * Helpers purs utilisés par l'orchestrateur `runRulesEngine` (TA-109).
 *
 * Tous : zéro I/O, zéro store. Extraits de `api/rules-engine-service.ts`
 * pour respecter R6 (taille max 250-400 lignes par fichier).
 */

import type { Session, SetLog } from '@/types';

import { detectPlateau } from './plateau-detection';
import type { ExerciseSession, PlateauAnalysis } from './plateau-detection';
import type { FatigueHistoryEntry } from './deload-rules';
import type { ExercisePlan } from './session-plan';

/**
 * Groupe les `SetLog` d'une séance par `plannedExerciseId`.
 * Les sets sans plannedExerciseId (freestyle) sont ignorés — `computeNextSessionPlan`
 * indexe par PlannedExercise.id (pitfall PROG-03).
 */
export function groupSetLogsByPlannedExerciseId(
  setLogs: SetLog[],
): Record<string, SetLog[]> {
  const acc: Record<string, SetLog[]> = {};
  for (const log of setLogs) {
    if (log.plannedExerciseId === null) continue;
    const list = acc[log.plannedExerciseId] ?? [];
    list.push(log);
    acc[log.plannedExerciseId] = list;
  }
  return acc;
}

/**
 * Pour chaque `exerciseId` distinct présent dans la séance courante, construit
 * l'historique chronologique (N-1 précédentes + courante) et appelle
 * `detectPlateau`.
 *
 * - Le `fatigueScore` de la séance courante = celui qu'on vient de calculer
 *   (non encore persisté).
 * - Pour les séances précédentes : on utilise `session.fatigueScore` persisté
 *   (default 0 si null — pour ne pas disqualifier indûment via le seuil de
 *   plateau, qui exige fatigueScore < 6).
 */
export function detectPlateauPerExercise(
  currentSetLogs: SetLog[],
  previousSessions: Session[],
  previousSetLogsBySession: Map<string, SetLog[]>,
  currentSession: Session,
  currentFatigueScore: number,
): PlateauAnalysis[] {
  const exerciseIds = new Set(
    currentSetLogs.filter((s) => s.completed).map((s) => s.exerciseId),
  );

  const results: PlateauAnalysis[] = [];

  for (const exerciseId of exerciseIds) {
    const history: ExerciseSession[] = [];

    for (const s of previousSessions) {
      const logs = previousSetLogsBySession.get(s.id) ?? [];
      const exerciseLogs = logs.filter(
        (l) => l.exerciseId === exerciseId && l.completed,
      );
      if (exerciseLogs.length === 0) continue;
      history.push({
        sessionId: s.id,
        sessionDate: s.date,
        fatigueScore: s.fatigueScore ?? 0,
        setLogs: exerciseLogs,
      });
    }

    const currentExerciseLogs = currentSetLogs.filter(
      (l) => l.exerciseId === exerciseId && l.completed,
    );
    if (currentExerciseLogs.length > 0) {
      history.push({
        sessionId: currentSession.id,
        sessionDate: currentSession.date,
        fatigueScore: currentFatigueScore,
        setLogs: currentExerciseLogs,
      });
    }

    const analysis = detectPlateau(history);
    if (analysis !== null) results.push(analysis);
  }

  return results;
}

/**
 * Construit `FatigueHistoryEntry[]` pour `shouldTriggerDeload`.
 *
 * Inclut une entrée par séance complétée (date = session.date), avec son
 * fatigue_score persisté. Filtre les séances sans fatigueScore pour ne pas
 * polluer la condition 1 avec des zéros artificiels.
 *
 * La séance courante est ajoutée avec le fatigue score qu'on vient de
 * calculer (non encore persisté).
 */
export function buildFatigueHistory(
  previousSessions: Session[],
  currentSession: Session,
  currentFatigueScore: number,
): FatigueHistoryEntry[] {
  const history: FatigueHistoryEntry[] = previousSessions
    .filter((s) => s.fatigueScore !== null)
    .map((s) => ({ date: s.date, fatigueScore: s.fatigueScore as number }));

  history.push({ date: currentSession.date, fatigueScore: currentFatigueScore });
  return history;
}

/**
 * Map ExercisePlan.decision → RecommendationAction (subset).
 * Les actions 'deload' et 'replace' ne sont jamais émises par
 * computeProgressionDecision (réservées respectivement à la reco type
 * 'deload' et 'plateau').
 */
export function mapDecisionToRecommendationAction(
  decision: ExercisePlan['decision'],
): 'increase' | 'maintain' | 'decrease' {
  switch (decision) {
    case 'increase':
      return 'increase';
    case 'decrease':
      return 'decrease';
    case 'maintain':
      return 'maintain';
  }
}
