import type { Block, DeloadStrategy } from '@/types/block';
import type { ExercisePlan } from './session-plan';

/**
 * Mode de déclenchement du deload.
 * Reprend `DeloadStrategy` (Block.deload_strategy) + `none` quand aucun deload
 * n'est déclenché.
 *
 * Source : docs/business-rules.md §3.4.
 */
export type DeloadMode = 'scheduled' | 'fatigue_triggered' | 'none';

/**
 * Décision de deload pour le bloc/contexte courant.
 *
 * - `triggered === true` : un deload est déclenché — `mode` indique le motif.
 * - `weekNumber` : pour mode `scheduled`, semaine deload programmée du bloc ;
 *   pour mode `fatigue_triggered` ou `forceDeload`, semaine actuelle (où
 *   le deload commence).
 */
export interface DeloadDecision {
  triggered: boolean;
  mode: DeloadMode;
  reason: string;
  weekNumber: number;
}

/**
 * Snapshot d'une séance récente pour la détection fatigue_triggered.
 *
 * - `performanceScore` : score 0-10 calculé post-séance (cf. business-rules.md §5).
 *   Optionnel — si absent sur une séance, elle ne peut pas servir à la condition 2.
 * - `date` : ISO 8601 — utilisé pour ordonner et calculer l'assiduité.
 */
export interface RecentSessionSnapshot {
  date: string;
  performanceScore: number | null;
}

/**
 * Entrée du fatigue history (jour par jour).
 * `fatigueScore` : score composite 0-10 issu de TA-105.
 */
export interface FatigueHistoryEntry {
  date: string;
  fatigueScore: number;
}

/**
 * Inputs de `shouldTriggerDeload`.
 *
 * - `block` : le bloc en cours, fournit `deloadStrategy`, `weekNumber`, `durationWeeks`.
 * - `recentSessions` : séances complétées récentes (utilisées pour condition 2).
 * - `fatigueHistory` : entrées récentes (utilisées pour conditions 1 et 3).
 * - `attendanceRate` : taux d'assiduité sur les 2 dernières semaines (0-1).
 *   Optionnel — si absent, condition 3 ne peut pas se déclencher.
 *   WHY : l'assiduité dépend du planifié vs réalisé et n'est pas reconstructible
 *   uniquement depuis recentSessions sans connaître la fréquence cible.
 * - `forceDeload` : si true, déclenche peu importe la stratégie ; mode hérité
 *   de la stratégie (ou 'scheduled' si stratégie 'none'), reason = 'manual'.
 */
export interface ShouldTriggerDeloadInputs {
  block: Pick<Block, 'deloadStrategy' | 'weekNumber' | 'durationWeeks'>;
  recentSessions: RecentSessionSnapshot[];
  fatigueHistory: FatigueHistoryEntry[];
  attendanceRate?: number;
  forceDeload?: boolean;
}

/**
 * Format du deload (docs/business-rules.md §3.4).
 * Centre de plage -30/-40% → -35%.
 */
const DELOAD_LOAD_FACTOR = 0.65;
const DELOAD_LOAD_ROUNDING_KG = 0.5;
const DELOAD_RIR_TARGET = 4;
const DELOAD_SETS_DELTA = 1;
const DELOAD_MIN_SETS = 1;

/** Conditions fatigue_triggered (docs/business-rules.md §3.4). */
const FATIGUE_HIGH_THRESHOLD = 9;
const FATIGUE_HIGH_CONSECUTIVE_DAYS = 2;
const FATIGUE_MODERATE_THRESHOLD = 7;
const ATTENDANCE_LOW_THRESHOLD = 0.75;
const PERFORMANCE_DECLINES_REQUIRED = 2; // 3 séances consécutives en baisse = 2 deltas négatifs

/**
 * Semaine deload pour mode `scheduled`.
 * Source : spec TA-108 (durée ≤ 5 → semaine 5 ; > 5 → semaine 7).
 */
function scheduledDeloadWeek(durationWeeks: number): number {
  return durationWeeks <= 5 ? 5 : 7;
}

/**
 * Vrai si `fatigueHistory` contient au moins `consecutive` jours
 * consécutifs (par date croissante) avec score >= `threshold`.
 *
 * "Consécutifs" = jours adjacents calendaires (delta = 1 jour). Un trou
 * dans l'historique brise la séquence.
 */
function hasConsecutiveHighFatigueDays(
  fatigueHistory: FatigueHistoryEntry[],
  threshold: number,
  consecutive: number,
): boolean {
  if (fatigueHistory.length < consecutive) return false;

  const sorted = [...fatigueHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  let streak = 0;
  let previousDate: Date | null = null;

  for (const entry of sorted) {
    const currentDate = new Date(entry.date);
    if (entry.fatigueScore >= threshold) {
      if (previousDate !== null) {
        const diffDays = Math.round(
          (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24),
        );
        streak = diffDays === 1 ? streak + 1 : 1;
      } else {
        streak = 1;
      }
      if (streak >= consecutive) return true;
    } else {
      streak = 0;
    }
    previousDate = currentDate;
  }

  return false;
}

/**
 * Vrai si la valeur la plus récente (any direction) du fatigue history dépasse
 * le seuil. Utilisé pour la condition 3 (combinée avec assiduité).
 */
function latestFatigueScore(fatigueHistory: FatigueHistoryEntry[]): number | null {
  if (fatigueHistory.length === 0) return null;
  const sorted = [...fatigueHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  return sorted[sorted.length - 1]!.fatigueScore;
}

/**
 * Vrai si `recentSessions` contient au moins 3 séances consécutives en baisse
 * de performance, triées par date.
 *
 * Une "baisse" = performanceScore strictement inférieur à la séance précédente.
 * 3 séances consécutives en baisse = 2 deltas négatifs successifs.
 *
 * Les séances sans performanceScore sont ignorées (pas d'évaluation possible).
 */
function hasConsecutivePerformanceDeclines(
  recentSessions: RecentSessionSnapshot[],
  declinesRequired: number,
): boolean {
  const withScores = recentSessions
    .filter((s): s is RecentSessionSnapshot & { performanceScore: number } =>
      s.performanceScore !== null,
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (withScores.length < declinesRequired + 1) return false;

  let consecutiveDeclines = 0;
  for (let i = 1; i < withScores.length; i++) {
    if (withScores[i]!.performanceScore < withScores[i - 1]!.performanceScore) {
      consecutiveDeclines++;
      if (consecutiveDeclines >= declinesRequired) return true;
    } else {
      consecutiveDeclines = 0;
    }
  }

  return false;
}

/**
 * Évalue les conditions du mode `fatigue_triggered`.
 * Retourne la raison déclenchante si une au moins est vraie, null sinon.
 */
function evaluateFatigueTriggeredConditions(
  fatigueHistory: FatigueHistoryEntry[],
  recentSessions: RecentSessionSnapshot[],
  attendanceRate: number | undefined,
): string | null {
  if (
    hasConsecutiveHighFatigueDays(
      fatigueHistory,
      FATIGUE_HIGH_THRESHOLD,
      FATIGUE_HIGH_CONSECUTIVE_DAYS,
    )
  ) {
    return `Fatigue score >= ${FATIGUE_HIGH_THRESHOLD} pendant ${FATIGUE_HIGH_CONSECUTIVE_DAYS}+ jours consécutifs.`;
  }

  if (hasConsecutivePerformanceDeclines(recentSessions, PERFORMANCE_DECLINES_REQUIRED)) {
    return '3+ séances consécutives avec performance en baisse.';
  }

  const latest = latestFatigueScore(fatigueHistory);
  if (
    latest !== null &&
    latest >= FATIGUE_MODERATE_THRESHOLD &&
    attendanceRate !== undefined &&
    attendanceRate < ATTENDANCE_LOW_THRESHOLD
  ) {
    return `Fatigue score >= ${FATIGUE_MODERATE_THRESHOLD} et assiduité < ${ATTENDANCE_LOW_THRESHOLD * 100}%.`;
  }

  return null;
}

/**
 * Mode de la décision en cas de forceDeload.
 * Si la stratégie est `none`, on retombe sur `scheduled` (deload manuel
 * forcé = traité comme un deload programmé ponctuel).
 */
function modeFromForcedStrategy(strategy: DeloadStrategy): Exclude<DeloadMode, 'none'> {
  return strategy === 'none' ? 'scheduled' : strategy;
}

/**
 * Détermine si un deload doit être déclenché.
 *
 * Trois cas :
 * 1. `forceDeload === true` → toujours déclenché (mode hérité, reason='manual').
 * 2. `deloadStrategy === 'none'` → null (pas de déclenchement automatique).
 * 3. `deloadStrategy === 'scheduled'` → déclenché si weekNumber >= semaine deload.
 * 4. `deloadStrategy === 'fatigue_triggered'` → déclenché si une des 3 conditions
 *    fatigue est vraie (cf. docs/business-rules.md §3.4).
 *
 * Fonction pure — zéro I/O, zéro store.
 *
 * @param inputs - block, recentSessions, fatigueHistory, attendanceRate?, forceDeload?
 * @returns DeloadDecision si déclenché, null sinon.
 */
export function shouldTriggerDeload(inputs: ShouldTriggerDeloadInputs): DeloadDecision | null {
  const { block, recentSessions, fatigueHistory, attendanceRate, forceDeload } = inputs;

  if (forceDeload === true) {
    return {
      triggered: true,
      mode: modeFromForcedStrategy(block.deloadStrategy),
      reason: 'manual',
      weekNumber:
        block.deloadStrategy === 'scheduled'
          ? scheduledDeloadWeek(block.durationWeeks)
          : block.weekNumber,
    };
  }

  if (block.deloadStrategy === 'none') {
    return null;
  }

  if (block.deloadStrategy === 'scheduled') {
    const targetWeek = scheduledDeloadWeek(block.durationWeeks);
    if (block.weekNumber >= targetWeek) {
      return {
        triggered: true,
        mode: 'scheduled',
        reason: `Deload programmé : semaine ${targetWeek} du bloc (durée ${block.durationWeeks} semaines).`,
        weekNumber: targetWeek,
      };
    }
    return null;
  }

  // fatigue_triggered
  const fatigueReason = evaluateFatigueTriggeredConditions(
    fatigueHistory,
    recentSessions,
    attendanceRate,
  );

  if (fatigueReason !== null) {
    return {
      triggered: true,
      mode: 'fatigue_triggered',
      reason: fatigueReason,
      weekNumber: block.weekNumber,
    };
  }

  return null;
}

/**
 * Arrondit une charge au pas DELOAD_LOAD_ROUNDING_KG (0.5 kg).
 */
function roundLoad(load: number): number {
  return Math.round(load / DELOAD_LOAD_ROUNDING_KG) * DELOAD_LOAD_ROUNDING_KG;
}

/**
 * Applique les modificateurs deload sur un ExercisePlan calculé.
 *
 * Format deload (docs/business-rules.md §3.4) :
 * - Charges : -35 % (centre de plage -30/-40 %), arrondi à 0.5 kg.
 * - Séries : -1 (jamais < 1).
 * - RIR cible : 4.
 *
 * Si le deload n'est pas déclenché (`deloadDecision.triggered === false`),
 * retourne le plan inchangé.
 *
 * Le champ `decision` (action de progression de base) est conservé — c'est
 * une info diagnostique. La `reason` est préfixée pour tracer le deload.
 *
 * @param exercisePlan - plan calculé par computeNextSessionPlan
 * @param deloadDecision - résultat de shouldTriggerDeload
 * @param plannedSets - sets planifiés (PlannedExercise.sets) pour appliquer -1
 * @returns ExercisePlan modifié (charges, sets, RIR)
 */
export function applyDeloadModifiers(
  exercisePlan: ExercisePlan,
  deloadDecision: DeloadDecision,
  plannedSets: number,
): ExercisePlan {
  if (!deloadDecision.triggered) {
    return exercisePlan;
  }

  const adjustedLoad =
    exercisePlan.next_load !== null
      ? roundLoad(exercisePlan.next_load * DELOAD_LOAD_FACTOR)
      : null;

  const adjustedSets = Math.max(DELOAD_MIN_SETS, plannedSets - DELOAD_SETS_DELTA);

  return {
    ...exercisePlan,
    next_load: adjustedLoad,
    next_rir_target: DELOAD_RIR_TARGET,
    next_sets: adjustedSets,
    reason: `Deload (${deloadDecision.mode}) : charge -35%, -1 série, RIR cible ${DELOAD_RIR_TARGET}. (${deloadDecision.reason})`,
  };
}
