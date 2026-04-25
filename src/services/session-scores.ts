import type { Session } from '@/types/session';
import type { SetLog } from '@/types/set-log';
import type { PlannedExercise } from '@/types/planned-exercise';

export type SessionScores = {
  completion_score: number;
  performance_score: number;
  fatigue_score: number;
};

export type ExerciseAchievement = {
  plannedExerciseId: string;
  exerciseId: string;
  target_achievement: number;
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeCompletionScore(
  setLogs: SetLog[],
  plannedExercises: PlannedExercise[]
): number {
  const totalPlanned = plannedExercises
    .filter((pe) => !pe.isUnplanned)
    .reduce((acc, pe) => acc + pe.sets, 0);

  if (totalPlanned === 0) return 1;

  const completedCount = setLogs.filter(
    (sl) => sl.completed && sl.plannedExerciseId !== null
  ).length;

  return clamp(completedCount / totalPlanned, 0, 1);
}

function computeTargetAchievement(
  setLogs: SetLog[],
  plannedExercises: PlannedExercise[]
): number {
  const plannedById = new Map(plannedExercises.map((pe) => [pe.id, pe]));

  let totalTargetLoad = 0;
  let totalActualLoad = 0;
  let totalTargetReps = 0;
  let totalActualReps = 0;
  let hasWeightReps = false;

  for (const sl of setLogs) {
    if (!sl.completed || sl.plannedExerciseId === null) continue;
    const pe = plannedById.get(sl.plannedExerciseId);
    if (!pe) continue;

    if (sl.targetLoad !== null && sl.targetReps !== null) {
      totalTargetLoad += sl.targetLoad;
      totalActualLoad += sl.load ?? 0;
      totalTargetReps += sl.targetReps;
      totalActualReps += sl.reps ?? 0;
      hasWeightReps = true;
    } else if (sl.reps !== null && pe.repRangeMax > 0) {
      const midTarget = (pe.repRangeMin + pe.repRangeMax) / 2;
      totalTargetReps += midTarget;
      totalActualReps += sl.reps;
      totalTargetLoad += 1;
      totalActualLoad += 1;
      hasWeightReps = true;
    }
  }

  // No planned exercises → free session, no penalty
  if (plannedExercises.filter((pe) => !pe.isUnplanned).length === 0) return 0.5;
  // Planned exercises exist but nothing completed → score 0
  if (!hasWeightReps) return 0;

  const loadRatio = totalTargetLoad > 0 ? totalActualLoad / totalTargetLoad : 1;
  const repsRatio = totalTargetReps > 0 ? totalActualReps / totalTargetReps : 1;
  return clamp(loadRatio * repsRatio, 0, 1.2);
}

function computeRirAccuracy(setLogs: SetLog[]): number | null {
  const setsWithTargetRir = setLogs.filter(
    (sl) => sl.completed && sl.targetRir !== null && sl.rir !== null
  );

  if (setsWithTargetRir.length === 0) return null;

  const sum = setsWithTargetRir.reduce((acc, sl) => {
    const diff = Math.abs((sl.targetRir as number) - (sl.rir as number));
    return acc + clamp(1 - diff / 5, 0, 1);
  }, 0);

  return sum / setsWithTargetRir.length;
}

function computeFatigueScore(readiness: number | null): number {
  if (readiness === null) return 5;
  if (readiness >= 6) return 2;
  if (readiness >= 4) return 5;
  if (readiness >= 3) return 7;
  return 9;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function computeSessionScores(
  session: Session,
  setLogs: SetLog[],
  plannedExercises: PlannedExercise[]
): SessionScores {
  const completion_score = computeCompletionScore(setLogs, plannedExercises);

  const targetAchievement = computeTargetAchievement(setLogs, plannedExercises);
  const rirAccuracy = computeRirAccuracy(setLogs);
  // Phase 4 stub — cross-session history not available until Phase 5.
  // Neutral contribution (0.5) until progressionVsPrevious is computed from real history.
  const PROGRESSION_PLACEHOLDER = 0.5;
  const progressionVsPrevious = PROGRESSION_PLACEHOLDER;

  const normalizedTargetAchievement = clamp(targetAchievement / 1.2, 0, 1);
  const rirContribution = rirAccuracy ?? 0.5;

  const raw =
    completion_score * 0.3 +
    normalizedTargetAchievement * 0.3 +
    rirContribution * 0.2 +
    progressionVsPrevious * 0.2;

  const performance_score = clamp(raw * 10, 0, 10);
  const fatigue_score = computeFatigueScore(session.readiness);

  return { completion_score, performance_score, fatigue_score };
}

export function computeExerciseAchievements(
  setLogs: SetLog[],
  plannedExercises: PlannedExercise[]
): ExerciseAchievement[] {
  return plannedExercises.map((pe) => {
    const logs = setLogs.filter(
      (sl) => sl.plannedExerciseId === pe.id && sl.completed
    );

    if (logs.length === 0) {
      return { plannedExerciseId: pe.id, exerciseId: pe.exerciseId, target_achievement: 0 };
    }

    let totalTargetLoad = 0;
    let totalActualLoad = 0;
    let totalTargetReps = 0;
    let totalActualReps = 0;
    let hasData = false;

    for (const sl of logs) {
      if (sl.targetLoad !== null && sl.targetReps !== null) {
        totalTargetLoad += sl.targetLoad;
        totalActualLoad += sl.load ?? 0;
        totalTargetReps += sl.targetReps;
        totalActualReps += sl.reps ?? 0;
        hasData = true;
      } else if (sl.reps !== null) {
        const midTarget = (pe.repRangeMin + pe.repRangeMax) / 2;
        totalTargetReps += midTarget;
        totalActualReps += sl.reps;
        totalTargetLoad += 1;
        totalActualLoad += 1;
        hasData = true;
      }
    }

    if (!hasData) {
      return { plannedExerciseId: pe.id, exerciseId: pe.exerciseId, target_achievement: 0.5 };
    }

    const loadRatio = totalTargetLoad > 0 ? totalActualLoad / totalTargetLoad : 1;
    const repsRatio = totalTargetReps > 0 ? totalActualReps / totalTargetReps : 1;
    const achievement = clamp(loadRatio * repsRatio, 0, 1.2);

    return { plannedExerciseId: pe.id, exerciseId: pe.exerciseId, target_achievement: achievement };
  });
}

export function performanceScoreLabel(score: number): string {
  if (score >= 8) return 'Excellente';
  if (score >= 6) return 'Réussie';
  if (score >= 4) return 'Moyenne';
  if (score >= 2) return 'Difficile';
  return 'À retravailler';
}
