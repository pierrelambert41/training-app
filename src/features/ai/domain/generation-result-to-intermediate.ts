import type { GenerationResult } from '@/types';
import type { AIIntermediateOutput } from '../types/ai-generation';

const DEFAULT_RIR = 2;

/**
 * Convertit la sortie du moteur déterministe Phase 3 vers le schéma JSON
 * intermédiaire partagé (ADR-028, TA-145).
 *
 * FallbackProvider produit ainsi exactement le même contrat que ClaudeProvider :
 * le service applique ensuite le même transformer (transformAIOutputToProgram)
 * pour les deux providers — un seul pipeline.
 *
 * start_weight_kg est null : le moteur Phase 3 ne calibre pas les charges
 * (cf. calibrateLoad TA-127, mécanisme séparé).
 */
export function generationResultToIntermediate(result: GenerationResult): AIIntermediateOutput {
  return {
    split: result.split,
    weeks: result.block.durationWeeks,
    days: result.days.map((draft) => ({
      name: draft.day.title,
      exercises: draft.plannedExercises.map((pe) => ({
        exercise_id: pe.exerciseId,
        sets: pe.sets,
        reps:
          pe.repRangeMin === pe.repRangeMax
            ? String(pe.repRangeMin)
            : `${pe.repRangeMin}-${pe.repRangeMax}`,
        rir: pe.targetRir ?? DEFAULT_RIR,
        start_weight_kg: null,
        progression: pe.progressionType,
      })),
    })),
  };
}
