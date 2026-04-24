/**
 * TA-22 — Résolution centralisée du `progressionType` et du `progressionConfig`
 * pour un `PlannedExercise` lors de la génération de programme.
 *
 * Domaine pur : aucun I/O, aucune lecture DB. Fonction déterministe :
 * (exercise, blockGoal, userLevel, role, repRange?) → ProgressionAssignment.
 *
 * Voir :
 *   - docs/business-rules.md §2 — types de progression
 *   - docs/data-model.md §3 — formats de progression_config
 *   - src/constants/progression-defaults.ts — valeurs par type × niveau
 *   - ADR-006, ADR-014
 */
import {
  ACCESSORY_LINEAR_DEFAULTS,
  BODYWEIGHT_PROGRESSION_DEFAULTS,
  DEFAULT_ACCESSORY_LINEAR_REP_RANGE,
  DEFAULT_BODYWEIGHT_REP_RANGE,
  DEFAULT_DOUBLE_PROGRESSION_REP_RANGE,
  DISTANCE_DURATION_DEFAULTS,
  DOUBLE_PROGRESSION_DEFAULTS,
  DURATION_PROGRESSION_DEFAULTS,
  STRENGTH_FIXED_DEFAULTS,
} from '@/constants/progression-defaults';
import type { BlockGoal } from '@/types/block';
import type { Exercise, MovementPattern } from '@/types/exercise';
import type {
  PlannedExerciseRole,
  ProgressionConfig,
  ProgressionType,
} from '@/types/planned-exercise';
import type { TrainingLevel } from '@/types/user';

export type ProgressionAssignment = {
  progressionType: ProgressionType;
  progressionConfig: ProgressionConfig;
};

export type RepRange = { min: number; max: number };

export type AssignProgressionInput = {
  exercise: Exercise;
  blockGoal: BlockGoal;
  userLevel: TrainingLevel;
  role: PlannedExerciseRole;
  /**
   * Plage de reps prévue pour le PlannedExercise. Optionnelle : si absente,
   * la fonction retombe sur les fourchettes par défaut du type résolu.
   * Si fournie, on swap min/max si l'appelant les a inversés (defensive).
   */
  repRange?: RepRange;
};

// ---------------------------------------------------------------------------
// Résolution du progressionType
// ---------------------------------------------------------------------------

const LOWER_BODY_PATTERNS = new Set<MovementPattern>([
  'squat',
  'hinge',
  'unilateral_quad',
  'unilateral_hinge',
  'isolation_lower',
]);

function isLowerBody(pattern: MovementPattern): boolean {
  return LOWER_BODY_PATTERNS.has(pattern);
}

/**
 * Règles de fallback (cf. ticket TA-22) — appliquées uniquement si
 * `exercise.recommendedProgressionType` est `null`.
 *
 * Priorité :
 *   1. logType `duration` → duration_progression
 *   2. logType `distance_duration` → distance_duration
 *   3. category `bodyweight` → bodyweight_progression
 *   4. role `accessory` → accessory_linear
 *   5. role `main` + category `compound` :
 *        - blockGoal strength/peaking → strength_fixed
 *        - sinon → double_progression
 *   6. par défaut → double_progression
 */
export function resolveProgressionType(
  exercise: Exercise,
  blockGoal: BlockGoal,
  role: PlannedExerciseRole
): ProgressionType {
  if (exercise.recommendedProgressionType) {
    return exercise.recommendedProgressionType;
  }

  // 1-2. Le logType impose le type quand l'exercice est en durée / distance.
  if (exercise.logType === 'duration') return 'duration_progression';
  if (exercise.logType === 'distance_duration') return 'distance_duration';

  // 3. Bodyweight : privilégier la progression dédiée même en main/accessory.
  if (
    exercise.category === 'bodyweight' ||
    exercise.logType === 'bodyweight_reps'
  ) {
    return 'bodyweight_progression';
  }

  // 4. Accessoire → linear.
  if (role === 'accessory') return 'accessory_linear';

  // 5. Composé en main : strength_fixed pour goals force/peaking, sinon double.
  //    Les goals 'hypertrophy' et 'deload' atterrissent intentionnellement en
  //    double_progression — le moteur de génération ne produit jamais un block
  //    'deload' ou 'peaking' sans avoir défini recommendedProgressionType côté
  //    exercice, donc ce fallback est un filet de sécurité, pas un chemin
  //    normal. Si un nouveau BlockGoal est ajouté, le type-check exhaustif
  //    ci-dessous provoquera une erreur de compilation.
  if (role === 'main' && exercise.category === 'compound') {
    if (blockGoal === 'strength' || blockGoal === 'peaking') {
      return 'strength_fixed';
    }
    // Exhaustive guard : force une erreur TS si un nouveau BlockGoal est ajouté
    // sans que ce switch ne soit mis à jour.
    const _exhaustiveCheck: 'hypertrophy' | 'deload' = blockGoal;
    void _exhaustiveCheck;
    return 'double_progression';
  }

  // 6. Default : double_progression couvre la majorité des cas (secondary,
  //    isolation en main, machine, cable, etc.).
  return 'double_progression';
}

// ---------------------------------------------------------------------------
// Construction du progressionConfig
// ---------------------------------------------------------------------------

function normalizeRepRange(input: RepRange | undefined, fallback: RepRange): RepRange {
  if (!input) return { ...fallback };
  // Defensive : si min > max (input invalide caller-side), on swap.
  const min = Math.min(input.min, input.max);
  const max = Math.max(input.min, input.max);
  return { min, max };
}

export function buildProgressionConfig(
  progressionType: ProgressionType,
  exercise: Exercise,
  userLevel: TrainingLevel,
  repRange?: RepRange
): ProgressionConfig {
  const lower = isLowerBody(exercise.movementPattern);

  switch (progressionType) {
    case 'strength_fixed':
      return { ...STRENGTH_FIXED_DEFAULTS[userLevel] };

    case 'double_progression': {
      const range = normalizeRepRange(repRange, DEFAULT_DOUBLE_PROGRESSION_REP_RANGE);
      const scale = lower
        ? DOUBLE_PROGRESSION_DEFAULTS[userLevel].lower
        : DOUBLE_PROGRESSION_DEFAULTS[userLevel].upper;
      return {
        increment_kg: scale.increment_kg,
        min_reps: range.min,
        max_reps: range.max,
        all_sets_at_max_to_increase: true,
        regressions_before_alert: scale.regressions_before_alert,
      };
    }

    case 'accessory_linear': {
      const range = normalizeRepRange(repRange, DEFAULT_ACCESSORY_LINEAR_REP_RANGE);
      return {
        increment_kg: ACCESSORY_LINEAR_DEFAULTS[userLevel].increment_kg,
        min_reps: range.min,
        max_reps: range.max,
        all_sets_at_max_to_increase: true,
      };
    }

    case 'bodyweight_progression': {
      const range = normalizeRepRange(repRange, DEFAULT_BODYWEIGHT_REP_RANGE);
      return {
        increment_kg: BODYWEIGHT_PROGRESSION_DEFAULTS[userLevel].increment_kg,
        min_reps: range.min,
        max_reps: range.max,
      };
    }

    case 'duration_progression':
      return { ...DURATION_PROGRESSION_DEFAULTS[userLevel] };

    case 'distance_duration':
      return { ...DISTANCE_DURATION_DEFAULTS[userLevel] };
  }
}

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

/**
 * Résout le couple (progressionType, progressionConfig) pour un PlannedExercise.
 * Pure : pas de side-effect, déterministe, pas d'I/O.
 *
 * Appelée par le moteur de génération (TA-21) au moment de créer chaque
 * PlannedExercise.
 */
export function assignProgressionConfig(
  input: AssignProgressionInput
): ProgressionAssignment {
  const progressionType = resolveProgressionType(
    input.exercise,
    input.blockGoal,
    input.role
  );
  const progressionConfig = buildProgressionConfig(
    progressionType,
    input.exercise,
    input.userLevel,
    input.repRange
  );
  return { progressionType, progressionConfig };
}
