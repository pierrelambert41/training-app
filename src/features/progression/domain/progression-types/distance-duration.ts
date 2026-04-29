import type { DistanceDurationConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';
import type { ProgressionDecision } from '../../types/progression-decision';

const DISTANCE_INCREMENT_METERS = 100;
const DURATION_DECREMENT_SECONDS = 30;

function lastDistance(setLogs: SetLog[]): number | null {
  const values = setLogs
    .map((s) => s.distanceMeters)
    .filter((d): d is number => d !== null);
  if (values.length === 0) return null;
  return values[values.length - 1]!;
}

function lastDuration(setLogs: SetLog[]): number | null {
  const values = setLogs
    .map((s) => s.durationSeconds)
    .filter((d): d is number => d !== null);
  if (values.length === 0) return null;
  return values[values.length - 1]!;
}

/**
 * distance_duration — cardio structuré intégré au programme.
 *
 * Règles (§2.6 business-rules.md) :
 * - Distance/temps cible atteints → augmenter distance ou réduire temps
 * - En dessous → maintenir
 * - setLogs vide → maintain
 *
 * Priorité : si target_distance_meters est défini, progression par distance.
 * Sinon progression par réduction de durée si target_duration_seconds défini.
 * Si config totalement vide → maintain.
 */
export function computeDistanceDuration(
  config: DistanceDurationConfig,
  setLogs: SetLog[],
  _history: ProgressionDecision[],
): ProgressionDecision {
  if (setLogs.length === 0) {
    return {
      action: 'maintain',
      next_load: null,
      next_rep_target: null,
      next_rir_target: null,
      reason: 'Aucune série enregistrée — cibles maintenues.',
    };
  }

  const completedSets = setLogs.filter((s) => s.completed);

  if (completedSets.length === 0) {
    return {
      action: 'maintain',
      next_load: null,
      next_rep_target: null,
      next_rir_target: null,
      reason: 'Aucune série complétée — cibles maintenues.',
    };
  }

  if (config.target_distance_meters !== undefined) {
    return computeByDistance(config.target_distance_meters, completedSets);
  }

  if (config.target_duration_seconds !== undefined) {
    return computeByDuration(config.target_duration_seconds, completedSets);
  }

  return {
    action: 'maintain',
    next_load: null,
    next_rep_target: null,
    next_rir_target: null,
    reason: 'Config distance_duration incomplète — maintien par défaut.',
  };
}

function computeByDistance(
  targetDistanceMeters: number,
  completedSets: SetLog[],
): ProgressionDecision {
  const currentDistance = lastDistance(completedSets);
  const allAtTarget = completedSets.every(
    (s) => s.distanceMeters !== null && s.distanceMeters >= targetDistanceMeters,
  );

  if (allAtTarget) {
    const nextDistance =
      currentDistance !== null
        ? currentDistance + DISTANCE_INCREMENT_METERS
        : targetDistanceMeters + DISTANCE_INCREMENT_METERS;
    return {
      action: 'increase',
      next_load: nextDistance,
      next_rep_target: null,
      next_rir_target: null,
      reason: `Distance cible (${targetDistanceMeters}m) atteinte — distance augmentée à ${nextDistance}m.`,
    };
  }

  return {
    action: 'maintain',
    next_load: currentDistance,
    next_rep_target: null,
    next_rir_target: null,
    reason: `Distance cible (${targetDistanceMeters}m) non atteinte — maintien.`,
  };
}

function computeByDuration(
  targetDurationSeconds: number,
  completedSets: SetLog[],
): ProgressionDecision {
  const currentDuration = lastDuration(completedSets);
  const allAtTarget = completedSets.every(
    (s) =>
      s.durationSeconds !== null && s.durationSeconds <= targetDurationSeconds,
  );

  if (allAtTarget) {
    const nextDuration =
      currentDuration !== null
        ? Math.max(0, currentDuration - DURATION_DECREMENT_SECONDS)
        : Math.max(0, targetDurationSeconds - DURATION_DECREMENT_SECONDS);
    return {
      action: 'increase',
      next_load: null,
      next_rep_target: nextDuration,
      next_rir_target: null,
      reason: `Temps cible (${targetDurationSeconds}s) atteint — temps réduit à ${nextDuration}s.`,
    };
  }

  return {
    action: 'maintain',
    next_load: null,
    next_rep_target: targetDurationSeconds,
    next_rir_target: null,
    reason: `Temps cible (${targetDurationSeconds}s) non atteint — maintien.`,
  };
}
