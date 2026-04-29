import type { DoubleProgressionConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';
import type { ProgressionDecision } from '../../types/progression-decision';

const DEFAULTS: Required<DoubleProgressionConfig> = {
  increment_kg: 2.5,
  min_reps: 6,
  max_reps: 8,
  all_sets_at_max_to_increase: true,
  regressions_before_alert: 2,
};

function resolveConfig(
  raw: DoubleProgressionConfig,
): Required<DoubleProgressionConfig> {
  return {
    increment_kg: raw.increment_kg ?? DEFAULTS.increment_kg,
    min_reps: raw.min_reps ?? DEFAULTS.min_reps,
    max_reps: raw.max_reps ?? DEFAULTS.max_reps,
    all_sets_at_max_to_increase:
      raw.all_sets_at_max_to_increase ?? DEFAULTS.all_sets_at_max_to_increase,
    regressions_before_alert:
      raw.regressions_before_alert ?? DEFAULTS.regressions_before_alert,
  };
}

function lastLoad(setLogs: SetLog[]): number | null {
  const loads = setLogs
    .map((s) => s.load)
    .filter((l): l is number => l !== null);
  if (loads.length === 0) return null;
  return loads[loads.length - 1]!;
}

function consecutiveRegressions(history: ProgressionDecision[]): number {
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

function averageReps(setLogs: SetLog[]): number | null {
  const completed = setLogs.filter((s) => s.completed && s.reps !== null);
  if (completed.length === 0) return null;
  const total = completed.reduce((acc, s) => acc + s.reps!, 0);
  return total / completed.length;
}

/**
 * double_progression — composés volume (4x6-8, 3x8-12, etc.)
 *
 * Règles (§2.2 business-rules.md) :
 * - Toutes séries au max de la fourchette → increase (+increment), reset reps au min
 * - Progression partielle (certaines séries montent) → maintain, continue monter reps
 * - regressions_before_alert régressions consécutives → alerte fatigue (decrease)
 * - setLogs vide → maintain
 */
export function computeDoubleProgression(
  config: DoubleProgressionConfig,
  setLogs: SetLog[],
  history: ProgressionDecision[],
): ProgressionDecision {
  const cfg = resolveConfig(config);
  const currentLoad = lastLoad(setLogs);

  if (setLogs.length === 0) {
    return {
      action: 'maintain',
      next_load: null,
      next_rep_target: cfg.min_reps,
      next_rir_target: null,
      reason: 'Aucune série enregistrée — charge maintenue.',
    };
  }

  const consecutiveRegs = consecutiveRegressions(history);
  if (consecutiveRegs >= cfg.regressions_before_alert) {
    return {
      action: 'decrease',
      next_load: currentLoad,
      next_rep_target: cfg.min_reps,
      next_rir_target: null,
      reason: `${cfg.regressions_before_alert} régressions consécutives détectées — alerte fatigue.`,
    };
  }

  const completedSets = setLogs.filter((s) => s.completed && s.reps !== null);

  if (completedSets.length === 0) {
    return {
      action: 'maintain',
      next_load: currentLoad,
      next_rep_target: cfg.min_reps,
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
      reason: `Toutes séries au max (${cfg.max_reps} reps) — charge augmentée de ${cfg.increment_kg} kg, reps remises à ${cfg.min_reps}.`,
    };
  }

  const avg = averageReps(setLogs);
  const nextRepTarget =
    avg !== null ? Math.min(Math.ceil(avg) + 1, cfg.max_reps) : cfg.min_reps;

  return {
    action: 'maintain',
    next_load: currentLoad,
    next_rep_target: nextRepTarget,
    next_rir_target: null,
    reason: `Progression partielle (moy. ${avg !== null ? avg.toFixed(1) : 'N/A'} reps) — charge maintenue, reps cibles : ${nextRepTarget}.`,
  };
}
