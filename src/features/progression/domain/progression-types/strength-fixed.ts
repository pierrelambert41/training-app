import type { StrengthFixedConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';
import type { ProgressionDecision } from '../../types/progression-decision';

const DEFAULTS: Required<StrengthFixedConfig> = {
  increment_upper_kg: 1.25,
  increment_lower_kg: 2.5,
  rir_threshold_increase: 2,
  failures_before_reset: 2,
  reset_delta_kg: 2.5,
};

function resolveConfig(raw: StrengthFixedConfig): Required<StrengthFixedConfig> {
  return {
    increment_upper_kg: raw.increment_upper_kg ?? DEFAULTS.increment_upper_kg,
    increment_lower_kg: raw.increment_lower_kg ?? DEFAULTS.increment_lower_kg,
    rir_threshold_increase:
      raw.rir_threshold_increase ?? DEFAULTS.rir_threshold_increase,
    failures_before_reset:
      raw.failures_before_reset ?? DEFAULTS.failures_before_reset,
    reset_delta_kg: raw.reset_delta_kg ?? DEFAULTS.reset_delta_kg,
  };
}

function lastLoad(setLogs: SetLog[]): number | null {
  const loads = setLogs
    .map((s) => s.load)
    .filter((l): l is number => l !== null);
  if (loads.length === 0) return null;
  return loads[loads.length - 1]!;
}

function consecutiveFailures(history: ProgressionDecision[]): number {
  let count = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i]!.action === 'decrease') {
      count++;
    } else {
      break;
    }
  }
  return count;
}

/**
 * strength_fixed — composés force (5x3, 5x5, etc.)
 *
 * Règles (§2.1 business-rules.md) :
 * - Toutes séries réussies + dernier set RIR >= rir_threshold_increase → increase (+increment)
 * - Toutes séries réussies + RIR 0-1                                   → maintain
 * - 1 série échouée                                                     → maintain
 * - failures_before_reset séances consécutives en decrease              → decrease (reset)
 * - setLogs vide                                                         → maintain
 */
export function computeStrengthFixed(
  config: StrengthFixedConfig,
  setLogs: SetLog[],
  history: ProgressionDecision[],
): ProgressionDecision {
  const cfg = resolveConfig(config);
  const currentLoad = lastLoad(setLogs);

  if (setLogs.length === 0) {
    return {
      action: 'maintain',
      next_load: null,
      next_rep_target: null,
      next_rir_target: null,
      reason: 'Aucune série enregistrée — charge maintenue.',
    };
  }

  const completedSets = setLogs.filter((s) => s.completed);
  const allCompleted =
    completedSets.length > 0 && completedSets.length === setLogs.length;
  const failedSets = setLogs.filter((s) => !s.completed);

  const currentIsFailure = failedSets.length >= 1;
  const consecutiveFails = consecutiveFailures(history);
  if (currentIsFailure && consecutiveFails + 1 >= cfg.failures_before_reset) {
    const resetLoad =
      currentLoad !== null
        ? Math.max(0, currentLoad - cfg.reset_delta_kg)
        : null;
    return {
      action: 'decrease',
      next_load: resetLoad,
      next_rep_target: null,
      next_rir_target: null,
      reason: `${cfg.failures_before_reset} séances consécutives échouées — reset de ${cfg.reset_delta_kg} kg.`,
    };
  }

  if (failedSets.length >= 1) {
    return {
      action: 'maintain',
      next_load: currentLoad,
      next_rep_target: null,
      next_rir_target: null,
      reason: `${failedSets.length} série(s) échouée(s) — charge maintenue.`,
    };
  }

  if (!allCompleted) {
    return {
      action: 'maintain',
      next_load: currentLoad,
      next_rep_target: null,
      next_rir_target: null,
      reason: 'Séance incomplète — charge maintenue.',
    };
  }

  const lastSetLog = setLogs[setLogs.length - 1]!;
  const lastRir = lastSetLog.rir;

  if (lastRir !== null && lastRir >= cfg.rir_threshold_increase) {
    // TODO stub: increment_upper_kg utilisé sans discriminer upper/lower — bodyPart absent de SetLog.
    // Voir docs/pitfalls.md § PROG-01.
    const increment = cfg.increment_upper_kg;
    const nextLoad = currentLoad !== null ? currentLoad + increment : null;
    return {
      action: 'increase',
      next_load: nextLoad,
      next_rep_target: null,
      next_rir_target: null,
      reason: `Toutes séries réussies, RIR ${lastRir} ≥ ${cfg.rir_threshold_increase} — augmentation de ${increment} kg.`,
    };
  }

  return {
    action: 'maintain',
    next_load: currentLoad,
    next_rep_target: null,
    next_rir_target: null,
    reason: `Toutes séries réussies, RIR trop faible (${lastRir ?? 'N/A'}) — charge maintenue.`,
  };
}
