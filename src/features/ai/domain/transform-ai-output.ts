import type {
  Exercise,
  GenerationDayDraft,
  GenerationResult,
  GenerationSplitKind,
  NewBlockInput,
  NewPlannedExerciseInput,
  NewProgramInput,
  PlannedExerciseRole,
  ProgressionConfig,
  ProgressionType,
  ProgramQuestionnaire,
  SplitType,
  TrainingLevel,
} from '@/types';
import type { AIIntermediateDay, AIIntermediateOutput } from '../types/ai-generation';

/**
 * Résultat de génération annoté de sa source (ADR-028, TA-145/146) :
 * 'fallback' permettra l'UX "remplacer par IA" au retour réseau.
 */
export type AIGenerationResult = GenerationResult & {
  generationSource: 'ai' | 'fallback';
};

/**
 * Dépendances injectées — le transformer est une fonction pure du domain :
 * pas d'import des services (UUID et progressionConfig viennent du caller api/).
 */
export type TransformDeps = {
  generateId: () => string;
  buildProgressionConfig: (
    progressionType: ProgressionType,
    exercise: Exercise,
    userLevel: TrainingLevel,
    repRange: { min: number; max: number }
  ) => ProgressionConfig;
};

export type TransformInput = {
  userId: string;
  questionnaire: ProgramQuestionnaire;
  /** Catalogue filtré — les exercise_id de la sortie IA y sont déjà validés (TA-143). */
  catalogue: Exercise[];
  source: 'ai' | 'fallback';
  /**
   * Slots hebdomadaires (spreadDayOrders du moteur Phase 3) calculés par le
   * caller — préserve l'espacement des jours d'entraînement (cf. TA-91).
   */
  dayOrderSlots: number[];
};

const REST_SECONDS_BY_ROLE: Record<PlannedExerciseRole, number> = {
  main: 180,
  secondary: 120,
  accessory: 90,
};

const ESTIMATED_MIN_PER_SET_BY_ROLE: Record<PlannedExerciseRole, number> = {
  main: 6,
  secondary: 4,
  accessory: 3,
};

const WARMUP_MIN = 8;

function parseReps(reps: string): { min: number; max: number } {
  const [low, high] = reps.split('-').map(Number);
  return { min: low, max: high ?? low };
}

function inferRole(exercise: Exercise, index: number): PlannedExerciseRole {
  if (index === 0) return 'main';
  if (exercise.category === 'compound') return 'secondary';
  return 'accessory';
}

function inferSplitType(dayName: string): SplitType | null {
  const name = dayName.toLowerCase();
  if (name.includes('push')) return 'push';
  if (name.includes('pull')) return 'pull';
  if (name.includes('leg') || name.includes('jambe')) return 'legs';
  if (name.includes('upper') || name.includes('haut')) return 'upper';
  if (name.includes('lower') || name.includes('bas')) return 'lower';
  if (name.includes('full')) return 'full';
  return null;
}

function deriveProgramTitle(
  questionnaire: ProgramQuestionnaire,
  split: string
): string {
  const goalLabels: Record<string, string> = {
    hypertrophy: 'Hypertrophie',
    strength: 'Force',
    mixed: 'Force & Esthétique',
  };
  const goal = questionnaire.goal ? goalLabels[questionnaire.goal] ?? questionnaire.goal : 'Entraînement';
  return `${goal} — ${split.replace(/_/g, ' ')}`;
}

function transformDay(
  day: AIIntermediateDay,
  blockId: string,
  dayOrder: number,
  input: TransformInput,
  deps: TransformDeps
): GenerationDayDraft {
  const byId = new Map(input.catalogue.map((e) => [e.id, e]));
  const dayId = deps.generateId();
  const level: TrainingLevel = input.questionnaire.level ?? 'intermediate';

  let estimatedMin = WARMUP_MIN;

  const plannedExercises: NewPlannedExerciseInput[] = day.exercises.map((aiEx, order) => {
    // exercise_id validé par TA-143 avant transformation — le `!` est sûr.
    const exercise = byId.get(aiEx.exercise_id)!;
    const role = inferRole(exercise, order);
    const repRange = parseReps(aiEx.reps);

    estimatedMin += aiEx.sets * ESTIMATED_MIN_PER_SET_BY_ROLE[role];

    const baseConfig = deps.buildProgressionConfig(
      aiEx.progression as ProgressionType,
      exercise,
      level,
      repRange
    );

    // start_weight_kg proposé par l'IA : conservé dans le config pour la
    // calibration initiale (le modèle PlannedExercise ne porte pas de charge).
    const progressionConfig: ProgressionConfig =
      aiEx.start_weight_kg !== null
        ? { ...baseConfig, start_weight_kg: aiEx.start_weight_kg }
        : baseConfig;

    return {
      id: deps.generateId(),
      workoutDayId: dayId,
      exerciseId: aiEx.exercise_id,
      exerciseOrder: order,
      role,
      sets: aiEx.sets,
      repRangeMin: repRange.min,
      repRangeMax: repRange.max,
      targetRir: aiEx.rir,
      restSeconds: REST_SECONDS_BY_ROLE[role],
      tempo: null,
      progressionType: aiEx.progression as ProgressionType,
      progressionConfig,
      notes: null,
      isUnplanned: false,
    };
  });

  return {
    day: {
      id: dayId,
      blockId,
      title: day.name,
      dayOrder,
      splitType: inferSplitType(day.name),
      estimatedDurationMin: estimatedMin,
    },
    plannedExercises,
  };
}

/**
 * Convertit le schéma JSON intermédiaire IA (validé par TA-143) vers la
 * structure interne complète (ADR-028, TA-142) : UUIDs, progressionConfig
 * complet via le builder Phase 3 injecté, métadonnées, estimation de durée.
 *
 * Partagé entre generateProgram et regenerateBlock (TA-144), et entre
 * ClaudeProvider et FallbackProvider (TA-145) — un seul transformer.
 */
export function transformAIOutputToProgram(
  aiOutput: AIIntermediateOutput,
  input: TransformInput,
  deps: TransformDeps
): AIGenerationResult {
  const programId = deps.generateId();
  const blockId = deps.generateId();
  const level = input.questionnaire.level ?? 'intermediate';
  const goal = input.questionnaire.goal ?? 'hypertrophy';

  const program: NewProgramInput = {
    id: programId,
    userId: input.userId,
    title: deriveProgramTitle(input.questionnaire, aiOutput.split),
    goal,
    frequency: input.questionnaire.frequencyDays,
    level: input.questionnaire.level,
    isActive: true,
  };

  const block: NewBlockInput = {
    id: blockId,
    programId,
    title: 'Bloc initial',
    goal: goal === 'mixed' ? 'hypertrophy' : goal,
    durationWeeks: aiOutput.weeks,
    weekNumber: 1,
    status: 'active',
    deloadStrategy: level === 'advanced' ? 'scheduled' : 'fatigue_triggered',
  };

  const days = aiOutput.days.map((day, idx) =>
    transformDay(day, blockId, input.dayOrderSlots[idx] ?? idx, input, deps)
  );

  return {
    program,
    block,
    days,
    split: aiOutput.split as GenerationSplitKind,
    warnings: [],
    generationSource: input.source,
  };
}
