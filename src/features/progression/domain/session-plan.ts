import { computeFatigueScore } from './fatigue-score';
import { computeProgressionDecision } from './compute-progression-decision';
import type { FatigueInputs, FatigueScore } from './fatigue-score';
import type { ProgressionDecision, ComputeProgressionDecisionArgs } from '../types/progression-decision';
import type {
  PlannedExercise,
  StrengthFixedConfig,
  DoubleProgressionConfig,
  AccessoryLinearConfig,
  BodyweightProgressionConfig,
  DurationProgressionConfig,
  DistanceDurationConfig,
} from '@/types/planned-exercise';
import type { Session } from '@/types/session';
import type { SetLog } from '@/types/set-log';

/**
 * Statut global d'une séance avant qu'elle commence.
 * Source : docs/business-rules.md §4.
 */
export type SessionStatus =
  | 'progression'
  | 'maintien'
  | 'allegee'
  | 'prudente'
  | 'aggressive'
  | 'deload';

/**
 * Plan calculé pour un exercice : charge cible + ajustements fatigue.
 */
export interface ExercisePlan {
  plannedExerciseId: string;
  next_load: number | null;
  next_rep_target: number | null;
  next_rir_target: number | null;
  /**
   * Nombre de séries cibles après ajustement fatigue.
   * null = inchangé par rapport à PlannedExercise.sets.
   * Réduit de 1 en statut `allegee` (spec §3.3 : -10% charge, -1 série).
   */
  next_sets: number | null;
  /** Décision de base du moteur de progression (avant surcharge fatigue). */
  decision: ProgressionDecision['action'];
  reason: string;
}

/**
 * Résultat complet du calcul de plan de séance.
 */
export interface SessionPlan {
  status: SessionStatus;
  fatigueScore: FatigueScore;
  exercisePlans: ExercisePlan[];
}

/**
 * Contexte de récupération passé en entrée du calcul.
 * Reprend FatigueInputs plus les dates de séances pour la détection de longue pause.
 */
export interface RecoveryContext extends FatigueInputs {
  /** Séances récentes complétées (pour détection longue pause > 14j). */
  recentCompletedSessions?: Pick<Session, 'endedAt'>[];
}

/**
 * Inputs de `computeNextSessionPlan`.
 *
 * - plannedExercises  : liste des PlannedExercise du WorkoutDay
 * - setLogsByExercise : SetLogs de la dernière séance groupés par exercice (pour décision de progression)
 * - progressionHistoryByExercise : historique des ProgressionDecision par exercise (pour reset/régression)
 * - recoveryContext   : données de récupération (toutes optionnelles, dégradation gracieuse)
 * - today             : date ISO du jour (optionnelle, défaut = new Date())
 */
export interface SessionPlanInputs {
  plannedExercises: PlannedExercise[];
  setLogsByExercise: Record<string, SetLog[]>;
  progressionHistoryByExercise: Record<string, ProgressionDecision[]>;
  recoveryContext?: RecoveryContext;
  today?: string;
}

const LONG_PAUSE_DAYS = 14;
const DELOAD_LOAD_FACTOR = 0.65; // -35% (centre de la plage -30/-40% spec §3.3)
const ALLEGEE_LOAD_FACTOR = 0.9;
const PRUDENTE_LOAD_FACTOR = 0.8;
const CONSECUTIVE_PROGRESSION_FOR_AGGRESSIVE = 3;

/**
 * Retourne true si la dernière séance complétée date de plus de LONG_PAUSE_DAYS jours.
 */
function isLongPause(
  recentCompletedSessions: Pick<Session, 'endedAt'>[],
  today: Date,
): boolean {
  const endedDates = recentCompletedSessions
    .map((s) => s.endedAt)
    .filter((d): d is string => d !== null);

  if (endedDates.length === 0) return false;

  const mostRecentEndedAt = endedDates
    .map((d) => new Date(d))
    .reduce((latest, d) => (d > latest ? d : latest));

  const diffMs = today.getTime() - mostRecentEndedAt.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays > LONG_PAUSE_DAYS;
}

/**
 * Compte les décisions d'`increase` consécutives depuis la fin de l'historique.
 * Utilisé pour détecter une progression constante (statut `aggressive`).
 */
function countConsecutiveProgressions(
  historyByExercise: Record<string, ProgressionDecision[]>,
): number {
  const allHistories = Object.values(historyByExercise);
  if (allHistories.length === 0) return 0;

  let minConsecutive = Infinity;
  for (const history of allHistories) {
    let count = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i]!.action === 'increase') {
        count++;
      } else {
        break;
      }
    }
    minConsecutive = Math.min(minConsecutive, count);
  }
  return minConsecutive === Infinity ? 0 : minConsecutive;
}

/**
 * Détermine le SessionStatus à partir du fatigue score et du contexte.
 * Source : docs/business-rules.md §4 et §3.3.
 */
function resolveSessionStatus(
  fatigueScore: FatigueScore,
  longPause: boolean,
  consecutiveProgressions: number,
  hasHistory: boolean,
): SessionStatus {
  // Fatigue 9-10 → deload (prime sur longue pause per §4 : deload > prudente)
  if (fatigueScore.score >= 9) return 'deload';

  // Longue pause (> 14j) → prudente
  if (longPause) return 'prudente';

  // Fatigue 7-8 → allegee
  if (fatigueScore.score >= 7) return 'allegee';

  // Fatigue 4-6 → maintien
  if (fatigueScore.score >= 4) return 'maintien';

  // Fatigue 0-3 : vérifier si aggressive
  if (
    fatigueScore.score <= 1 &&
    hasHistory &&
    consecutiveProgressions >= CONSECUTIVE_PROGRESSION_FOR_AGGRESSIVE
  ) {
    return 'aggressive';
  }

  // Fatigue 0-3 → progression normale
  return 'progression';
}

/**
 * Applique la surcharge fatigue sur une décision de progression.
 *
 * Les statuts `allegee`, `deload` et `prudente` écrasent la charge calculée
 * par le moteur de progression — mais conservent la décision logique (action).
 */
function applyFatigueOverride(
  baseDecision: ProgressionDecision,
  status: SessionStatus,
  plannedExercise: PlannedExercise,
): ExercisePlan {
  const baseLoad = baseDecision.next_load;

  if (status === 'deload') {
    const adjustedLoad =
      baseLoad !== null ? Math.round(baseLoad * DELOAD_LOAD_FACTOR * 4) / 4 : null;
    return {
      plannedExerciseId: plannedExercise.id,
      next_load: adjustedLoad,
      next_rep_target: plannedExercise.repRangeMin,
      next_rir_target: 4,
      next_sets: null, // Spec §3.3 : réduction de volume deload hors scope ce ticket (charge + RIR suffisent)
      decision: baseDecision.action,
      reason: `Deload : charge réduite à ${DELOAD_LOAD_FACTOR * 100}%, RIR cible 4+. (Base : ${baseDecision.reason})`,
    };
  }

  if (status === 'allegee') {
    const adjustedLoad =
      baseLoad !== null ? Math.round(baseLoad * ALLEGEE_LOAD_FACTOR * 4) / 4 : null;
    // Spec §3.3 : séance allégée = -10% charge ET -1 série (minimum 1 série)
    const reducedSets = Math.max(1, plannedExercise.sets - 1);
    return {
      plannedExerciseId: plannedExercise.id,
      next_load: adjustedLoad,
      next_rep_target: baseDecision.next_rep_target,
      next_rir_target: baseDecision.next_rir_target,
      next_sets: reducedSets,
      decision: baseDecision.action,
      reason: `Séance allégée : charge réduite de 10%, -1 série. (Base : ${baseDecision.reason})`,
    };
  }

  if (status === 'prudente') {
    const adjustedLoad =
      baseLoad !== null ? Math.round(baseLoad * PRUDENTE_LOAD_FACTOR * 4) / 4 : null;
    return {
      plannedExerciseId: plannedExercise.id,
      next_load: adjustedLoad,
      next_rep_target: baseDecision.next_rep_target,
      next_rir_target: baseDecision.next_rir_target,
      next_sets: null,
      decision: baseDecision.action,
      reason: `Retour après longue pause : charge réduite de 20%. (Base : ${baseDecision.reason})`,
    };
  }

  return {
    plannedExerciseId: plannedExercise.id,
    next_load: baseLoad,
    next_rep_target: baseDecision.next_rep_target,
    next_rir_target: baseDecision.next_rir_target,
    next_sets: null,
    decision: baseDecision.action,
    reason: baseDecision.reason,
  };
}

/**
 * Construit les args typés pour le dispatcher de progression.
 * Retourne null si le progressionType est inconnu ou si la config est incompatible.
 */
function buildProgressionArgs(
  plannedExercise: PlannedExercise,
  setLogs: SetLog[],
  history: ProgressionDecision[],
): ComputeProgressionDecisionArgs | null {
  const { progressionType, progressionConfig } = plannedExercise;

  switch (progressionType) {
    case 'strength_fixed':
      return { type: 'strength_fixed', config: progressionConfig as StrengthFixedConfig, setLogs, history };
    case 'double_progression':
      return { type: 'double_progression', config: progressionConfig as DoubleProgressionConfig, setLogs, history };
    case 'accessory_linear':
      return { type: 'accessory_linear', config: progressionConfig as AccessoryLinearConfig, setLogs, history };
    case 'bodyweight_progression':
      return { type: 'bodyweight_progression', config: progressionConfig as BodyweightProgressionConfig, setLogs, history };
    case 'duration_progression':
      return { type: 'duration_progression', config: progressionConfig as DurationProgressionConfig, setLogs, history };
    case 'distance_duration':
      return { type: 'distance_duration', config: progressionConfig as DistanceDurationConfig, setLogs, history };
    default:
      return null;
  }
}

/**
 * Calcule le plan de séance complet avant qu'elle commence.
 *
 * Orchestre `computeFatigueScore` (TA-105) et `computeProgressionDecision` (TA-104)
 * pour produire un statut global + des charges cibles par exercice.
 *
 * Fonction pure — zéro I/O, zéro store.
 *
 * Source : docs/business-rules.md §4 (statut), §3.3 (décisions fatigue).
 *
 * @param inputs - PlannedExercises, SetLogs récents, historique de progression, contexte de récupération
 * @returns SessionPlan — statut + fatigueScore + plans par exercice
 */
export function computeNextSessionPlan(inputs: SessionPlanInputs): SessionPlan {
  const {
    plannedExercises,
    setLogsByExercise,
    progressionHistoryByExercise,
    recoveryContext = {},
    today: todayStr,
  } = inputs;

  const today = todayStr ? new Date(todayStr) : new Date();

  const fatigueScore = computeFatigueScore(recoveryContext);

  const recentCompletedSessions = recoveryContext.recentCompletedSessions ?? [];
  const longPause = recentCompletedSessions.length > 0
    ? isLongPause(recentCompletedSessions, today)
    : false;

  const hasHistory = Object.values(progressionHistoryByExercise).some(
    (h) => h.length > 0,
  );

  const consecutiveProgressions = countConsecutiveProgressions(
    progressionHistoryByExercise,
  );

  const status = resolveSessionStatus(
    fatigueScore,
    longPause,
    consecutiveProgressions,
    hasHistory,
  );

  const exercisePlans: ExercisePlan[] = plannedExercises.map((exercise) => {
    const setLogs = setLogsByExercise[exercise.id] ?? []; // indexé par PlannedExercise.id — voir pitfall PROG-03
    const history = progressionHistoryByExercise[exercise.id] ?? []; // indexé par PlannedExercise.id — voir pitfall PROG-03

    const args = buildProgressionArgs(exercise, setLogs, history);

    if (args === null) {
      return {
        plannedExerciseId: exercise.id,
        next_load: null,
        next_rep_target: exercise.repRangeMin,
        next_rir_target: exercise.targetRir,
        next_sets: null,
        decision: 'maintain' as const,
        reason: `Type de progression inconnu : ${exercise.progressionType}`,
      };
    }

    const baseDecision = computeProgressionDecision(args);
    return applyFatigueOverride(baseDecision, status, exercise);
  });

  return {
    status,
    fatigueScore,
    exercisePlans,
  };
}
