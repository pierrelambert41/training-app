/**
 * TA-22 — Templates de configuration par type de progression et par niveau.
 *
 * Source de vérité unique pour les valeurs par défaut de `progressionConfig`
 * (cf. `docs/business-rules.md §2` et `docs/data-model.md §3`).
 *
 * Règles d'ajustement par niveau (cf. ticket TA-22) :
 * - Débutant   : incréments plus agressifs (progression linéaire rapide).
 * - Intermédiaire : valeurs canoniques de la doc (référence).
 * - Avancé     : incréments plus fins, plus de tolérance à l'échec.
 *
 * Aucune logique métier ici, juste des constantes et un picker pur.
 */
import type { TrainingLevel } from '@/types/user';
import type {
  AccessoryLinearConfig,
  BodyweightProgressionConfig,
  DistanceDurationConfig,
  DoubleProgressionConfig,
  DurationProgressionConfig,
  StrengthFixedConfig,
} from '@/types/planned-exercise';

// ---------------------------------------------------------------------------
// strength_fixed
// ---------------------------------------------------------------------------

/**
 * Incréments en kg : "upper" = haut du corps, "lower" = bas du corps.
 * `failures_before_reset` augmente avec le niveau (un avancé tolère plus
 * d'échecs avant un reset car ses charges sont relativement plus proches du
 * 1RM réel — un échec est moins informatif).
 *
 * `reset_delta_kg` pour l'avancé (-5) est plus profond malgré une plus grande
 * tolérance à l'échec : "plus de tolérance" signifie qu'on attend plus
 * longtemps avant de conclure à une stagnation réelle, mais quand le reset est
 * acté, l'avancé travaille si proche de son 1RM qu'un recul superficiel ne
 * suffit pas à relancer la progression — il faut une marge significative.
 *
 * `reset_delta_kg` est uniforme (pas de distinction upper/lower) : le reset
 * est un signal de stagnation globale sur le mouvement, indépendant du groupe
 * musculaire. Différencier compliquerait la lisibilité sans apport réel, car
 * les incréments upper/lower sont déjà asymétriques et le reset se calibre en
 * semaines de retour, pas en pourcentage du 1RM.
 */
export const STRENGTH_FIXED_DEFAULTS: Record<TrainingLevel, StrengthFixedConfig> = {
  beginner: {
    increment_upper_kg: 2.5,
    increment_lower_kg: 5,
    rir_threshold_increase: 1,
    failures_before_reset: 2,
    reset_delta_kg: -2.5,
  },
  intermediate: {
    increment_upper_kg: 1.25,
    increment_lower_kg: 2.5,
    rir_threshold_increase: 2,
    failures_before_reset: 2,
    reset_delta_kg: -2.5,
  },
  advanced: {
    increment_upper_kg: 0.5,
    increment_lower_kg: 1.25,
    rir_threshold_increase: 2,
    failures_before_reset: 3,
    reset_delta_kg: -5,
  },
};

// ---------------------------------------------------------------------------
// double_progression
// ---------------------------------------------------------------------------

type DoubleProgressionScaleByBody = {
  upper: Pick<DoubleProgressionConfig, 'increment_kg' | 'regressions_before_alert'>;
  lower: Pick<DoubleProgressionConfig, 'increment_kg' | 'regressions_before_alert'>;
};

export const DOUBLE_PROGRESSION_DEFAULTS: Record<TrainingLevel, DoubleProgressionScaleByBody> = {
  beginner: {
    upper: { increment_kg: 2.5, regressions_before_alert: 2 },
    lower: { increment_kg: 5, regressions_before_alert: 2 },
  },
  intermediate: {
    upper: { increment_kg: 1.25, regressions_before_alert: 2 },
    lower: { increment_kg: 2.5, regressions_before_alert: 2 },
  },
  advanced: {
    upper: { increment_kg: 0.5, regressions_before_alert: 3 },
    lower: { increment_kg: 1.25, regressions_before_alert: 3 },
  },
};

export const DEFAULT_DOUBLE_PROGRESSION_REP_RANGE = { min: 8, max: 12 } as const;

// ---------------------------------------------------------------------------
// accessory_linear
// ---------------------------------------------------------------------------

export const ACCESSORY_LINEAR_DEFAULTS: Record<TrainingLevel, Pick<AccessoryLinearConfig, 'increment_kg'>> = {
  beginner: { increment_kg: 2.5 },
  intermediate: { increment_kg: 1.25 },
  advanced: { increment_kg: 0.5 },
};

export const DEFAULT_ACCESSORY_LINEAR_REP_RANGE = { min: 10, max: 15 } as const;

// ---------------------------------------------------------------------------
// bodyweight_progression
// ---------------------------------------------------------------------------

/**
 * `increment_kg` représente le lest ajouté (dip belt, ceinture lestée).
 * Débutant : on évite d'introduire le lest trop tôt (incréments en reps
 * d'abord), donc on garde un lest grossier ; avancé : lest plus fin pour
 * coller au plus près des micro-progressions.
 */
export const BODYWEIGHT_PROGRESSION_DEFAULTS: Record<TrainingLevel, Pick<BodyweightProgressionConfig, 'increment_kg'>> = {
  beginner: { increment_kg: 5 },
  intermediate: { increment_kg: 2.5 },
  advanced: { increment_kg: 1.25 },
};

export const DEFAULT_BODYWEIGHT_REP_RANGE = { min: 5, max: 12 } as const;

// ---------------------------------------------------------------------------
// duration_progression
// ---------------------------------------------------------------------------

export const DURATION_PROGRESSION_DEFAULTS: Record<TrainingLevel, DurationProgressionConfig> = {
  beginner: { increment_seconds: 10, target_seconds: 30 },
  intermediate: { increment_seconds: 5, target_seconds: 45 },
  advanced: { increment_seconds: 5, target_seconds: 60 },
};

// ---------------------------------------------------------------------------
// distance_duration
// ---------------------------------------------------------------------------

/**
 * Cardio structuré intégré au programme : valeurs prudentes par défaut, à
 * recalibrer par l'utilisateur lors de la première séance.
 */
export const DISTANCE_DURATION_DEFAULTS: Record<TrainingLevel, DistanceDurationConfig> = {
  beginner: { target_distance_meters: 1000, target_duration_seconds: 360 },
  intermediate: { target_distance_meters: 1500, target_duration_seconds: 480 },
  advanced: { target_distance_meters: 2000, target_duration_seconds: 540 },
};
