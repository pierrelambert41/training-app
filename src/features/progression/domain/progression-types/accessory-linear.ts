import type { AccessoryLinearConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';
import type { ProgressionDecision } from '../../types/progression-decision';

const DEFAULTS: Required<AccessoryLinearConfig> = {
  increment_kg: 1.25,
  min_reps: 10,
  max_reps: 15,
  all_sets_at_max_to_increase: true,
};

function resolveConfig(
  raw: AccessoryLinearConfig,
): Required<AccessoryLinearConfig> {
  return {
    increment_kg: raw.increment_kg ?? DEFAULTS.increment_kg,
    min_reps: raw.min_reps ?? DEFAULTS.min_reps,
    max_reps: raw.max_reps ?? DEFAULTS.max_reps,
    all_sets_at_max_to_increase:
      raw.all_sets_at_max_to_increase ?? DEFAULTS.all_sets_at_max_to_increase,
  };
}

function lastLoad(setLogs: SetLog[]): number | null {
  const loads = setLogs
    .map((s) => s.load)
    .filter((l): l is number => l !== null);
  if (loads.length === 0) return null;
  return loads[loads.length - 1]!;
}

/**
 * accessory_linear — exercices accessoires (curls, extensions, etc.)
 *
 * Règles (§2.3 business-rules.md) :
 * - Haut de fourchette atteint sur toutes les séries → increase (+increment minimum)
 * - Progression partielle → maintain
 * - setLogs vide → maintain
 */
export function computeAccessoryLinear(
  config: AccessoryLinearConfig,
  setLogs: SetLog[],
  _history: ProgressionDecision[],
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

  const completedSets = setLogs.filter((s) => s.completed && s.reps !== null);

  if (completedSets.length === 0) {
    return {
      action: 'maintain',
      next_load: currentLoad,
      next_rep_target: null,
      next_rir_target: null,
      reason: 'Aucune série complétée — charge maintenue.',
    };
  }

  const allAtMax = completedSets.every((s) => s.reps! >= cfg.max_reps);

  if (allAtMax) {
    const nextLoad =
      currentLoad !== null ? currentLoad + cfg.increment_kg : null;
    return {
      action: 'increase',
      next_load: nextLoad,
      next_rep_target: cfg.min_reps,
      next_rir_target: null,
      reason: `Haut de fourchette atteint sur toutes les séries (${cfg.max_reps} reps) — augmentation de ${cfg.increment_kg} kg.`,
    };
  }

  return {
    action: 'maintain',
    next_load: currentLoad,
    next_rep_target: null,
    next_rir_target: null,
    reason: 'Progression partielle — charge maintenue.',
  };
}
