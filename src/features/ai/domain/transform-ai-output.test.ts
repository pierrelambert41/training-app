/**
 * Tests TA-142 — Transformer schéma intermédiaire IA → structure interne.
 *
 * Vérifie :
 * - program/block/days/plannedExercises construits avec UUIDs injectés
 * - reps "6-8" → repRangeMin/Max ; reps "10" → min === max
 * - rôles inférés (1er = main, compound = secondary, isolation = accessory)
 * - progressionConfig construit via le builder injecté + start_weight_kg conservé
 * - dayOrder = slots hebdomadaires injectés (espacement TA-91)
 * - generationSource annoté ('ai' | 'fallback')
 * - durée estimée calculée (8 min + min/set par rôle)
 */

import type { Exercise, ProgramQuestionnaire } from '@/types';
import { transformAIOutputToProgram } from './transform-ai-output';
import type { TransformDeps, TransformInput } from './transform-ai-output';
import type { AIIntermediateOutput } from '../types/ai-generation';

function makeExercise(id: string, category: Exercise['category']): Exercise {
  return {
    id,
    name: id,
    nameFr: id,
    category,
    movementPattern: 'horizontal_push',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: ['barbell'],
    logType: 'weight_reps',
    isUnilateral: false,
    systemicFatigue: 'moderate',
    movementStability: 'stable',
    morphoTags: [],
    recommendedProgressionType: 'double_progression',
    alternatives: [],
    coachingNotes: null,
    tags: [],
    isCustom: false,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
  };
}

const questionnaire: ProgramQuestionnaire = {
  goal: 'hypertrophy',
  frequencyDays: 3,
  preferredDays: null,
  level: 'intermediate',
  equipment: 'full_gym',
  injuries: '',
  avoidExercises: '',
  priorityMuscles: [],
  sportsParallel: '',
  maxSessionDurationMin: 60,
  mixedPriority: null,
  volumeTolerance: 'medium',
  importHistory: false,
  weightKg: '',
  heightCm: '',
};

const aiOutput: AIIntermediateOutput = {
  split: 'full_body_ab',
  weeks: 6,
  days: [
    {
      name: 'Full Body A',
      exercises: [
        { exercise_id: 'bench_press', sets: 4, reps: '6-8', rir: 2, start_weight_kg: 80, progression: 'double_progression' },
        { exercise_id: 'squat', sets: 3, reps: '5', rir: 2, start_weight_kg: 100, progression: 'strength_fixed' },
        { exercise_id: 'curl', sets: 3, reps: '10-15', rir: 1, start_weight_kg: null, progression: 'accessory_linear' },
      ],
    },
    {
      name: 'Full Body B',
      exercises: [
        { exercise_id: 'squat', sets: 4, reps: '6-8', rir: 2, start_weight_kg: 100, progression: 'double_progression' },
      ],
    },
  ],
};

function makeDeps(): TransformDeps {
  let counter = 0;
  return {
    generateId: jest.fn(() => `uuid-${++counter}`),
    buildProgressionConfig: jest.fn((_type, _exercise, _level, repRange) => ({
      increment_kg: 2.5,
      min_reps: repRange.min,
      max_reps: repRange.max,
    })),
  };
}

function makeInput(overrides: Partial<TransformInput> = {}): TransformInput {
  return {
    userId: 'user-1',
    questionnaire,
    catalogue: [
      makeExercise('bench_press', 'compound'),
      makeExercise('squat', 'compound'),
      makeExercise('curl', 'isolation'),
    ],
    source: 'ai',
    dayOrderSlots: [0, 3],
    ...overrides,
  };
}

describe('transformAIOutputToProgram', () => {
  it('construit program, block et days avec les UUIDs injectés', () => {
    const result = transformAIOutputToProgram(aiOutput, makeInput(), makeDeps());

    expect(result.program.id).toBe('uuid-1');
    expect(result.program.userId).toBe('user-1');
    expect(result.program.goal).toBe('hypertrophy');
    expect(result.program.isActive).toBe(true);

    expect(result.block.id).toBe('uuid-2');
    expect(result.block.programId).toBe('uuid-1');
    expect(result.block.durationWeeks).toBe(6);
    expect(result.block.status).toBe('active');

    expect(result.days).toHaveLength(2);
    expect(result.days[0].day.title).toBe('Full Body A');
    expect(result.days[0].day.splitType).toBe('full');
    expect(result.split).toBe('full_body_ab');
  });

  it('parse les reps en plage et valeur unique', () => {
    const result = transformAIOutputToProgram(aiOutput, makeInput(), makeDeps());
    const [bench, squat] = result.days[0].plannedExercises;

    expect(bench.repRangeMin).toBe(6);
    expect(bench.repRangeMax).toBe(8);
    expect(squat.repRangeMin).toBe(5);
    expect(squat.repRangeMax).toBe(5);
  });

  it('infère les rôles : 1er = main, compound = secondary, isolation = accessory', () => {
    const result = transformAIOutputToProgram(aiOutput, makeInput(), makeDeps());
    const roles = result.days[0].plannedExercises.map((pe) => pe.role);
    expect(roles).toEqual(['main', 'secondary', 'accessory']);
  });

  it('construit le progressionConfig via le builder injecté et conserve start_weight_kg', () => {
    const deps = makeDeps();
    const result = transformAIOutputToProgram(aiOutput, makeInput(), deps);
    const bench = result.days[0].plannedExercises[0];
    const curl = result.days[0].plannedExercises[2];

    expect(deps.buildProgressionConfig).toHaveBeenCalledWith(
      'double_progression',
      expect.objectContaining({ id: 'bench_press' }),
      'intermediate',
      { min: 6, max: 8 }
    );
    expect(bench.progressionConfig).toMatchObject({ start_weight_kg: 80, min_reps: 6, max_reps: 8 });
    expect(bench.progressionType).toBe('double_progression');
    // start_weight_kg null → pas de clé ajoutée
    expect(curl.progressionConfig).not.toHaveProperty('start_weight_kg');
  });

  it('applique les slots hebdomadaires injectés (dayOrder, TA-91)', () => {
    const result = transformAIOutputToProgram(aiOutput, makeInput({ dayOrderSlots: [1, 4] }), makeDeps());
    expect(result.days[0].day.dayOrder).toBe(1);
    expect(result.days[1].day.dayOrder).toBe(4);
  });

  it('annote la source de génération', () => {
    expect(transformAIOutputToProgram(aiOutput, makeInput(), makeDeps()).generationSource).toBe('ai');
    expect(
      transformAIOutputToProgram(aiOutput, makeInput({ source: 'fallback' }), makeDeps()).generationSource
    ).toBe('fallback');
  });

  it('estime la durée de séance (8 min + min/set par rôle)', () => {
    const result = transformAIOutputToProgram(aiOutput, makeInput(), makeDeps());
    // Jour A : main 4 sets × 6 + secondary 3 × 4 + accessory 3 × 3 = 24+12+9 + 8 = 53
    expect(result.days[0].day.estimatedDurationMin).toBe(53);
  });
});
