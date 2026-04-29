import type { BodyweightProgressionConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';
import type { ProgressionDecision } from '../../types/progression-decision';

const DEFAULTS: Required<BodyweightProgressionConfig> = {
  increment_kg: 2.5,
  min_reps: 5,
  max_reps: 10,
};

function resolveConfig(
  raw: BodyweightProgressionConfig,
): Required<BodyweightProgressionConfig> {
  return {
    increment_kg: raw.increment_kg ?? DEFAULTS.increment_kg,
    min_reps: raw.min_reps ?? DEFAULTS.min_reps,
    max_reps: raw.max_reps ?? DEFAULTS.max_reps,
  };
}

function lastLoad(setLogs: SetLog[]): number | null {
  const loads = setLogs
    .map((s) => s.load)
    .filter((l): l is number => l !== null);
  if (loads.length === 0) return null;
  return loads[loads.length - 1]!;
}

function averageReps(completedSets: SetLog[]): number | null {
  const withReps = completedSets.filter((s) => s.reps !== null);
  if (withReps.length === 0) return null;
  const total = withReps.reduce((acc, s) => acc + s.reps!, 0);
  return total / withReps.length;
}

/**
 * bodyweight_progression — dips, tractions, pompes, etc.
 *
 * Règles (§2.4 business-rules.md) :
 * - Haut de fourchette atteint sur toutes les séries → ajouter du lest (+increment)
 * - Lest ajouté + reps trop basses → revenir au poids de corps (load = 0)
 * - Reps insuffisantes → maintenir
 * - setLogs vide → maintain
 *
 * Convention load : 0 = poids de corps pur, >0 = lest en kg ajouté.
 */
export function computeBodyweightProgression(
  config: BodyweightProgressionConfig,
  setLogs: SetLog[],
  _history: ProgressionDecision[],
): ProgressionDecision {
  const cfg = resolveConfig(config);
  const currentLoad = lastLoad(setLogs);
  const hasAddedWeight = currentLoad !== null && currentLoad > 0;

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

  const avgReps = averageReps(completedSets);
  const allAtMax = completedSets.every((s) => s.reps! >= cfg.max_reps);

  if (hasAddedWeight && avgReps !== null && avgReps < cfg.min_reps) {
    return {
      action: 'decrease',
      next_load: 0,
      next_rep_target: cfg.min_reps,
      next_rir_target: null,
      reason: `Lest présent mais reps trop basses (moy. ${avgReps.toFixed(1)} < ${cfg.min_reps}) — retour au poids de corps.`,
    };
  }

  if (allAtMax) {
    const nextLoad =
      currentLoad !== null ? currentLoad + cfg.increment_kg : cfg.increment_kg;
    return {
      action: 'increase',
      next_load: nextLoad,
      next_rep_target: cfg.min_reps,
      next_rir_target: null,
      reason: `Haut de fourchette atteint sur toutes les séries (${cfg.max_reps} reps) — ajout de ${cfg.increment_kg} kg de lest.`,
    };
  }

  return {
    action: 'maintain',
    next_load: currentLoad,
    next_rep_target: null,
    next_rir_target: null,
    reason: `Reps insuffisantes pour augmenter (moy. ${avgReps !== null ? avgReps.toFixed(1) : 'N/A'} < ${cfg.max_reps}) — maintien.`,
  };
}
