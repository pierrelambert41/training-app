import type { DurationProgressionConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';
import type { ProgressionDecision } from '../../types/progression-decision';

const DEFAULTS: Required<DurationProgressionConfig> = {
  increment_seconds: 10,
  target_seconds: 60,
};

function resolveConfig(
  raw: DurationProgressionConfig,
): Required<DurationProgressionConfig> {
  return {
    increment_seconds: raw.increment_seconds ?? DEFAULTS.increment_seconds,
    target_seconds: raw.target_seconds ?? DEFAULTS.target_seconds,
  };
}

function lastDuration(setLogs: SetLog[]): number | null {
  const durations = setLogs
    .map((s) => s.durationSeconds)
    .filter((d): d is number => d !== null);
  if (durations.length === 0) return null;
  return durations[durations.length - 1]!;
}

/**
 * duration_progression — planches, isométriques, etc.
 *
 * Règles (§2.5 business-rules.md) :
 * - Durée cible atteinte → augmenter durée (+increment_seconds)
 * - En dessous de la cible → maintenir
 * - setLogs vide → maintain
 */
export function computeDurationProgression(
  config: DurationProgressionConfig,
  setLogs: SetLog[],
  _history: ProgressionDecision[],
): ProgressionDecision {
  const cfg = resolveConfig(config);
  const currentDuration = lastDuration(setLogs);

  if (setLogs.length === 0) {
    return {
      action: 'maintain',
      next_load: null,
      next_rep_target: null,
      next_rir_target: null,
      reason: 'Aucune série enregistrée — durée maintenue.',
    };
  }

  const completedSets = setLogs.filter(
    (s) => s.completed && s.durationSeconds !== null,
  );

  if (completedSets.length === 0) {
    return {
      action: 'maintain',
      next_load: null,
      next_rep_target: currentDuration,
      next_rir_target: null,
      reason: 'Aucune série avec durée complétée — durée maintenue.',
    };
  }

  const allAtTarget = completedSets.every(
    (s) => s.durationSeconds! >= cfg.target_seconds,
  );

  if (allAtTarget) {
    const nextDuration =
      currentDuration !== null
        ? currentDuration + cfg.increment_seconds
        : cfg.target_seconds + cfg.increment_seconds;
    return {
      action: 'increase',
      next_load: null,
      next_rep_target: nextDuration,
      next_rir_target: null,
      reason: `Durée cible atteinte (${cfg.target_seconds}s) — durée augmentée à ${nextDuration}s.`,
    };
  }

  return {
    action: 'maintain',
    next_load: null,
    next_rep_target: cfg.target_seconds,
    next_rir_target: null,
    reason: `Durée cible (${cfg.target_seconds}s) non atteinte — maintien.`,
  };
}
