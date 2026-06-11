import type { Block, Exercise, ProgramQuestionnaire, TrainingLevel } from '@/types';
import type { AIContextProfile } from './ai-context';

/**
 * Types de la génération de programme par IA (ADR-028, TA-142/143/144).
 *
 * L'IA produit un schéma JSON intermédiaire épuré — jamais le type Program
 * complet. Le validateur déterministe (validate-ai-program.ts) opère sur ce
 * schéma AVANT la transformation transformAIOutputToProgram.
 */

/**
 * Contexte de génération initiale (ClaudeProvider.generateProgram, TA-142).
 * Le questionnaire est le type Phase 3 existant — contrat partagé avec
 * FallbackProvider (TA-145), aucune divergence possible.
 */
export type ProgramGenerationContext = {
  profile: AIContextProfile;
  questionnaire: ProgramQuestionnaire;
};

/** Progression observée d'un exercice sur le bloc précédent (input regenerateBlock). */
export type BlockExerciseProgress = {
  exerciseId: string;
  exerciseName: string;
  e1rmTrend: 'up' | 'down' | 'plateau' | 'stable';
  complianceRate: number;
};

/** Statistiques agrégées du bloc précédent — calculées avant l'appel IA (TA-144). */
export type BlockStats = {
  complianceRate: number;
  /** Nombre de séances par semaine du bloc précédent (structure à reconduire). */
  daysPerWeek: number;
  exerciseProgress: BlockExerciseProgress[];
  avgFatigueScore: number | null;
  /** PR réalisés pendant le bloc, formulés pour le prompt. */
  prs: string[];
};

/** Contexte de régénération de bloc (ClaudeProvider.regenerateBlock, TA-144). */
export type BlockRegenerationContext = {
  profile: AIContextProfile;
  previousBlock: Block;
  previousBlockStats: BlockStats;
  reason: 'end_of_block' | 'goal_change' | 'compliance_gap';
};

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
  | 'session_too_long'
  | 'session_too_sparse';

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
