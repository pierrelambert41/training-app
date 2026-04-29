import { computeStrengthFixed } from './progression-types/strength-fixed';
import { computeDoubleProgression } from './progression-types/double-progression';
import { computeAccessoryLinear } from './progression-types/accessory-linear';
import { computeBodyweightProgression } from './progression-types/bodyweight-progression';
import { computeDurationProgression } from './progression-types/duration-progression';
import { computeDistanceDuration } from './progression-types/distance-duration';
import type { ComputeProgressionDecisionArgs, ProgressionDecision } from '../types/progression-decision';

/**
 * Dispatcher principal du moteur de progression.
 *
 * Délègue à la fonction pure correspondant au progressionType.
 * Toutes les fonctions appelées sont pures : zéro I/O, zéro store.
 *
 * Source de vérité : docs/business-rules.md §2.
 */
export function computeProgressionDecision(
  args: ComputeProgressionDecisionArgs,
): ProgressionDecision {
  switch (args.type) {
    case 'strength_fixed':
      return computeStrengthFixed(args.config, args.setLogs, args.history);
    case 'double_progression':
      return computeDoubleProgression(args.config, args.setLogs, args.history);
    case 'accessory_linear':
      return computeAccessoryLinear(args.config, args.setLogs, args.history);
    case 'bodyweight_progression':
      return computeBodyweightProgression(
        args.config,
        args.setLogs,
        args.history,
      );
    case 'duration_progression':
      return computeDurationProgression(args.config, args.setLogs, args.history);
    case 'distance_duration':
      return computeDistanceDuration(args.config, args.setLogs, args.history);
  }
}
