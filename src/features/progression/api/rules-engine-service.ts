/**
 * TA-109 — Service rules engine : orchestration et persistance des recommandations.
 *
 * Charge l'historique d'une séance fraîchement complétée, exécute le moteur
 * de progression (TA-104..TA-108) en mode pur, puis persiste :
 *  - les `Recommendation` (load_change par exo, plateau par exo en plateau,
 *    deload niveau séance si déclenché)
 *  - les scores `completion_score`, `performance_score`, `fatigue_score` sur
 *    la `Session` (avec `progressionVsPrevious` réel — remplace stub TA-83)
 *  - le statut du `Block` (active → deloaded) si deload déclenché.
 *
 * Idempotence : rejouer `runRulesEngine(sessionId)` produit le même état
 * sémantique. Implémentation : `clearRecommendationsForSession` au début,
 * jamais de régression de status sur Block.
 *
 * Source : docs/business-rules.md §2..§6, ADR-011.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { getBlockById, updateBlock } from '@/services/blocks';
import { getPlannedExercisesByWorkoutDayId } from '@/services/planned-exercises';
import {
  clearRecommendationsForSession,
  saveRecommendation,
} from '@/services/recommendations';
import {
  computeSessionScores,
  type SessionScores,
} from '@/services/session-scores';
import { getSessionById, getSessionsByUserId, updateSession } from '@/services/sessions';
import { getSetLogsBySessionId } from '@/services/set-logs';
import type { PlannedExercise, Recommendation, Session, SetLog } from '@/types';
import { generateUUID } from '@/utils/uuid';

import { computeNextSessionPlan } from '../domain/session-plan';
import type { SessionPlan, SessionPlanInputs } from '../domain/session-plan';
import type { PlateauAnalysis } from '../domain/plateau-detection';
import { shouldTriggerDeload } from '../domain/deload-rules';
import type {
  DeloadDecision,
  RecentSessionSnapshot,
} from '../domain/deload-rules';
import { computeProgressionVsPrevious } from '../domain/progression-vs-previous';
import { computeFatigueScore } from '../domain/fatigue-score';
import {
  buildFatigueHistory,
  detectPlateauPerExercise,
  groupSetLogsByPlannedExerciseId,
  mapDecisionToRecommendationAction,
} from '../domain/rules-engine-helpers';

/**
 * Résultat de l'exécution du moteur de règles pour une séance.
 *
 * Toutes les valeurs sont déjà persistées en SQLite (et enqueuées sync) au
 * moment où l'objet est retourné. Le résultat sert à l'UI post-séance et
 * aux tests d'intégration.
 */
export interface RulesEngineResult {
  /** Plan calculé pour la *prochaine* séance — à afficher post-completion. */
  sessionPlan: SessionPlan;
  /** Recommandations persistées (load_change, plateau, deload). */
  recommendations: Recommendation[];
  /** Score de fatigue (0..10) écrit sur la séance courante. */
  fatigueScore: number;
  /** Plateaux détectés par exercice. */
  plateauAlerts: PlateauAnalysis[];
  /** True si le moteur a déclenché un deload (block.status passé en 'deloaded'). */
  deloadTriggered: boolean;
  /** Décision deload brute, null si pas évalué (free session) ou non déclenché. */
  deloadDecision: DeloadDecision | null;
  /** Scores recalculés écrits sur Session (override du fallback de completeSession). */
  sessionScores: SessionScores;
}

export interface RunRulesEngineOptions {
  /** Nombre de séances historiques à charger (défaut 5). Inclut la séance courante. */
  historySize?: number;
}

const DEFAULT_HISTORY_SIZE = 5;

/**
 * Point d'entrée unique. Idempotent par construction.
 */
export async function runRulesEngine(
  db: SQLiteDatabase,
  sessionId: string,
  options: RunRulesEngineOptions = {},
): Promise<RulesEngineResult> {
  const historySize = options.historySize ?? DEFAULT_HISTORY_SIZE;

  const session = await getSessionById(db, sessionId);
  if (!session) {
    throw new Error(`runRulesEngine: session not found (${sessionId}).`);
  }

  const currentSetLogs = await getSetLogsBySessionId(db, sessionId);

  // Charge les N dernières sessions de l'utilisateur (sans la courante).
  // getSessionsByUserId tri par date DESC ; on filtre la courante puis on
  // découpe à `historySize - 1` (la séance courante compte pour 1).
  const allUserSessions = await getSessionsByUserId(db, session.userId, historySize + 1);
  const previousCompletedSessions = allUserSessions
    .filter((s) => s.id !== sessionId && s.status === 'completed')
    .slice(0, historySize - 1);

  const previousSetLogsBySession = await loadSetLogsForSessions(
    db,
    previousCompletedSessions,
  );

  const previousMostRecent = previousCompletedSessions[0] ?? null;
  const previousMostRecentSetLogs = previousMostRecent
    ? previousSetLogsBySession.get(previousMostRecent.id) ?? []
    : null;

  // -- progressionVsPrevious : remplace stub TA-83 --------------------------
  const progressionVsPrevious = computeProgressionVsPrevious(
    currentSetLogs,
    previousMostRecentSetLogs,
  );

  // -- plannedExercises (référence pour le plan) ----------------------------
  const plannedExercises: PlannedExercise[] = session.workoutDayId
    ? await getPlannedExercisesByWorkoutDayId(db, session.workoutDayId)
    : [];

  // -- fatigue score de la séance courante ----------------------------------
  // RecoveryLog/CardioSession non disponibles (PROG-02) → on ne passe que
  // les setLogs récents et la readiness pré-séance.
  const recentSetLogsByCompletedSession = [
    ...previousCompletedSessions.map((s) => previousSetLogsBySession.get(s.id) ?? []),
    currentSetLogs,
  ];

  const preSessionReadiness = buildPreSessionReadiness(session);

  const currentFatigue = computeFatigueScore({
    recentSetLogs: recentSetLogsByCompletedSession,
    preSessionReadiness,
  });

  // -- scores de séance (override du fallback dans completeSession) ---------
  const sessionScores = computeSessionScores(
    session,
    currentSetLogs,
    plannedExercises,
    progressionVsPrevious,
  );
  // WHY : computeSessionScores produit son propre fatigue_score à partir de
  // readiness uniquement (legacy Phase 4). On le remplace par le score
  // composite TA-105.
  const finalScores: SessionScores = {
    completion_score: sessionScores.completion_score,
    performance_score: sessionScores.performance_score,
    fatigue_score: currentFatigue.score,
  };

  // -- session-plan pour la *prochaine* séance ------------------------------
  const sessionPlanInputs: SessionPlanInputs = {
    plannedExercises,
    setLogsByExercise: groupSetLogsByPlannedExerciseId(currentSetLogs),
    // Pas d'historique de ProgressionDecision persisté à ce stade (hors scope
    // TA-109 — sera ajouté quand on stockera les décisions inter-séances).
    progressionHistoryByExercise: {},
    recoveryContext: {
      recentSetLogs: recentSetLogsByCompletedSession,
      preSessionReadiness,
      recentCompletedSessions: previousCompletedSessions.map((s) => ({ endedAt: s.endedAt })),
    },
  };

  const sessionPlan = computeNextSessionPlan(sessionPlanInputs);

  // -- Détection plateau par exercice ---------------------------------------
  const plateauAlerts = detectPlateauPerExercise(
    currentSetLogs,
    previousCompletedSessions,
    previousSetLogsBySession,
    session,
    finalScores.fatigue_score,
  );

  // -- Décision deload ------------------------------------------------------
  const block = session.blockId ? await getBlockById(db, session.blockId) : null;

  let deloadDecision: DeloadDecision | null = null;
  if (block !== null) {
    const recentSessionsForDeload: RecentSessionSnapshot[] = [
      ...previousCompletedSessions
        .filter((s) => s.endedAt !== null)
        .map((s) => ({
          date: s.endedAt as string,
          performanceScore: s.performanceScore,
        })),
      // séance courante avec son score recalculé
      {
        date: session.endedAt ?? session.date,
        performanceScore: finalScores.performance_score,
      },
    ];

    deloadDecision = shouldTriggerDeload({
      block: {
        deloadStrategy: block.deloadStrategy,
        weekNumber: block.weekNumber,
        durationWeeks: block.durationWeeks,
      },
      recentSessions: recentSessionsForDeload,
      fatigueHistory: buildFatigueHistory(
        previousCompletedSessions,
        session,
        finalScores.fatigue_score,
      ),
    });
  }

  // -- Persistence : nettoyage idempotent + écritures -----------------------
  await clearRecommendationsForSession(db, sessionId);

  const recommendations: Recommendation[] = [];

  // load_change par exercice du plan
  for (const plan of sessionPlan.exercisePlans) {
    const exercise = plannedExercises.find((pe) => pe.id === plan.plannedExerciseId);
    if (exercise === undefined) continue;
    const rec = await saveRecommendation(db, {
      id: generateUUID(),
      sessionId,
      exerciseId: exercise.exerciseId,
      source: 'rules_engine',
      type: 'load_change',
      message: plan.reason,
      nextLoad: plan.next_load,
      nextRepTarget: plan.next_rep_target,
      nextRirTarget: plan.next_rir_target,
      action: mapDecisionToRecommendationAction(plan.decision),
      confidence: 0.8,
      metadata: {
        plannedExerciseId: exercise.id,
        sessionStatus: sessionPlan.status,
        nextSets: plan.next_sets,
      },
    });
    recommendations.push(rec);
  }

  // plateau par exercice détecté
  for (const plateau of plateauAlerts) {
    const rec = await saveRecommendation(db, {
      id: generateUUID(),
      sessionId,
      exerciseId: plateau.exerciseId,
      source: 'rules_engine',
      type: 'plateau',
      message: plateau.recommendations.map((r) => r.message).join(' '),
      action: plateau.recommendations.some((r) => r.type === 'replace') ? 'replace' : 'maintain',
      confidence: 0.75,
      metadata: {
        sessionsInPlateau: plateau.sessionsInPlateau,
        recommendations: plateau.recommendations,
      },
    });
    recommendations.push(rec);
  }

  // deload niveau séance si déclenché
  if (deloadDecision !== null && deloadDecision.triggered) {
    const rec = await saveRecommendation(db, {
      id: generateUUID(),
      sessionId,
      exerciseId: null,
      source: 'rules_engine',
      type: 'deload',
      message: `Deload recommandé (${deloadDecision.mode}) : ${deloadDecision.reason}`,
      action: 'deload',
      confidence: 0.9,
      metadata: {
        mode: deloadDecision.mode,
        reason: deloadDecision.reason,
        weekNumber: deloadDecision.weekNumber,
      },
    });
    recommendations.push(rec);
  }

  // -- Mise à jour des scores de la séance ----------------------------------
  await updateSession(db, sessionId, {
    completionScore: finalScores.completion_score,
    performanceScore: finalScores.performance_score,
    fatigueScore: finalScores.fatigue_score,
  });

  // -- Mutation du block (active → deloaded) si deload déclenché ------------
  // ADR-011 : transition explicite. Idempotent : on ne touche pas si block
  // déjà en 'deloaded' / 'completed' / 'planned'. `deloadTriggered=true`
  // reflète la décision du moteur indépendamment de l'état précédent.
  let deloadTriggered = false;
  if (block !== null && deloadDecision !== null && deloadDecision.triggered) {
    if (block.status === 'active') {
      await updateBlock(db, block.id, { status: 'deloaded' });
    }
    deloadTriggered = true;
  }

  return {
    sessionPlan,
    recommendations,
    fatigueScore: finalScores.fatigue_score,
    plateauAlerts,
    deloadTriggered,
    deloadDecision,
    sessionScores: finalScores,
  };
}

// ---------------------------------------------------------------------------
// I/O helpers (file-local — pas réutilisés ailleurs)
// ---------------------------------------------------------------------------

async function loadSetLogsForSessions(
  db: SQLiteDatabase,
  sessions: Session[],
): Promise<Map<string, SetLog[]>> {
  const map = new Map<string, SetLog[]>();
  for (const s of sessions) {
    const logs = await getSetLogsBySessionId(db, s.id);
    map.set(s.id, logs);
  }
  return map;
}

function buildPreSessionReadiness(session: Session) {
  const hasAny =
    session.readiness !== null ||
    session.energy !== null ||
    session.motivation !== null ||
    session.sleepQuality !== null;
  if (!hasAny) return undefined;
  return {
    readiness: session.readiness,
    energy: session.energy,
    motivation: session.motivation,
    sleepQuality: session.sleepQuality,
  };
}
