import type { Exercise, TrainingLevel } from '@/types';

/**
 * Types de la génération de programme par IA (ADR-028, TA-142/143/144).
 *
 * L'IA produit un schéma JSON intermédiaire épuré — jamais le type Program
 * complet. Le validateur déterministe (validate-ai-program.ts) opère sur ce
 * schéma AVANT la transformation transformAIOutputToProgram.
 */

/** Un exercice du schéma intermédiaire produit par l'IA. */
export type AIIntermediateExercise = {
  exercise_id: string;
  sets: number;
  /** Plage de reps "6-8" ou valeur unique "10". */
  reps: string;
  rir: number;
  /** null pour les exercices au poids du corps / durée. */
  start_weight_kg: number | null;
  /** Doit appartenir aux 6 progressionType ADR-006. */
  progression: string;
};

export type AIIntermediateDay = {
  name: string;
  exercises: AIIntermediateExercise[];
};

/** Schéma JSON intermédiaire de sortie IA (generateProgram et regenerateBlock). */
export type AIIntermediateOutput = {
  split: string;
  weeks: number;
  days: AIIntermediateDay[];
  /** Justification courte demandée au modèle — jamais persistée. */
  reasoning?: string;
};

/** Contraintes utilisateur opposables à la sortie IA (sous-ensemble du questionnaire). */
export type UserConstraints = {
  /** Items d'équipement disponibles (cf. EQUIPMENT_AVAILABLE_BY_TYPE). */
  equipmentAllowed: string[];
  /** Muscles à éviter (blessures) — match sur Exercise.primaryMuscles. */
  forbiddenMuscles: string[];
  /** Tags morpho/blessure interdits — match sur Exercise.morphoTags. */
  forbiddenMorphoTags: string[];
  /** Durée max de séance en minutes (null = pas de contrainte). */
  maxSessionDurationMin: number | null;
};

export type ValidationContext = {
  catalogue: Exercise[];
  userConstraints: UserConstraints;
  frequencyDays: number;
  level: TrainingLevel;
};

export type ValidationErrorCode =
  | 'schema_invalid'
  | 'unknown_exercise'
  | 'invalid_progression'
  | 'invalid_split'
  | 'day_count_mismatch'
  | 'equipment_unavailable'
  | 'forbidden_exercise'
  | 'session_too_long';

export type ValidationError = {
  code: ValidationErrorCode;
  /** Champ ou chemin concerné, ex: "days[1].exercises[2].exercise_id". */
  field: string;
  message: string;
  /** false = avertissement non-bloquant. */
  blocking: boolean;
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  /** Texte actionnable injecté dans le prompt du retry si valid: false. */
  feedback?: string;
};

/**
 * Levée après l'échec du cycle génération → validation → retry → validation.
 * Le caller bascule alors sur FallbackProvider (TA-145).
 */
export class AIValidationExhaustedError extends Error {
  readonly errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    super(
      `AI program validation failed after retry: ${errors.map((e) => e.code).join(', ')}`
    );
    this.name = 'AIValidationExhaustedError';
    this.errors = errors;
  }
}

export type AIProviderErrorCode =
  | 'timeout'
  | 'network'
  | 'rate_limited'
  | 'http_error'
  | 'invalid_response';

/** Erreur typée du transport ClaudeProvider (TA-142) — remonte au caller sans retry automatique. */
export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;

  constructor(code: AIProviderErrorCode, message: string) {
    super(message);
    this.name = 'AIProviderError';
    this.code = code;
  }
}
