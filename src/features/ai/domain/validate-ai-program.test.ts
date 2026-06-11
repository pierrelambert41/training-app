/**
 * Tests TA-143 — Validateur déterministe post-IA (schéma intermédiaire).
 *
 * Vérifie :
 * - programme valide → valid: true, pas de feedback
 * - exercise_id halluciné → rejet avec feedback actionnable (mentionne l'ID fautif)
 * - progression hors ADR-006 → rejet
 * - split incohérent avec la fréquence → rejet
 * - nombre de jours ≠ fréquence → rejet
 * - matériel indisponible → rejet
 * - muscle interdit (blessure) / tag morpho interdit → rejet
 * - séance trop longue vs maxSessionDurationMin → rejet
 * - erreurs de schéma : weeks hors bornes, sets/reps/rir invalides, progression manquante
 * - le feedback agrège les erreurs bloquantes
 */

import type { Exercise } from '@/types';
import { validateAIGeneratedProgram, validSplitsForFrequency } from './validate-ai-program';
import type {
  AIIntermediateOutput,
  ValidationContext,
} from '../types/ai-generation';

function makeExercise(overrides: Partial<Exercise> = {}): Exercise {
  return {
    id: 'bench_press',
    name: 'Bench Press',
    nameFr: 'Développé couché',
    category: 'compound',
    movementPattern: 'horizontal_push',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['triceps'],
    equipment: ['barbell', 'bench'],
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
    ...overrides,
  };
}

const catalogue: Exercise[] = [
  makeExercise(),
  makeExercise({ id: 'squat', name: 'Squat', movementPattern: 'squat', primaryMuscles: ['quads'], equipment: ['barbell', 'rack'] }),
  makeExercise({ id: 'row', name: 'Row', movementPattern: 'horizontal_pull', primaryMuscles: ['back'], equipment: ['barbell'] }),
  makeExercise({ id: 'ohp', name: 'OHP', movementPattern: 'vertical_push', primaryMuscles: ['shoulders'], equipment: ['barbell'], morphoTags: ['shoulder_risky'] }),
];

function makeContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
  return {
    catalogue,
    userConstraints: {
      equipmentAllowed: ['barbell', 'bench', 'rack'],
      forbiddenMuscles: [],
      forbiddenMorphoTags: [],
      maxSessionDurationMin: null,
    },
    frequencyDays: 3,
    level: 'intermediate',
    ...overrides,
  };
}

function makeOutput(overrides: Partial<AIIntermediateOutput> = {}): AIIntermediateOutput {
  const day = (name: string) => ({
    name,
    exercises: [
      {
        exercise_id: 'bench_press',
        sets: 4,
        reps: '6-8',
        rir: 2,
        start_weight_kg: 80,
        progression: 'double_progression',
      },
      {
        exercise_id: 'squat',
        sets: 3,
        reps: '5',
        rir: 2,
        start_weight_kg: 100,
        progression: 'strength_fixed',
      },
    ],
  });
  return {
    split: 'full_body_abc',
    weeks: 6,
    days: [day('Full Body A'), day('Full Body B'), day('Full Body C')],
    ...overrides,
  };
}

describe('validateAIGeneratedProgram', () => {
  it('programme valide → valid: true, aucun feedback', () => {
    const result = validateAIGeneratedProgram(makeOutput(), makeContext());
    expect(result.errors).toEqual([]);
    expect(result.valid).toBe(true);
    expect(result.feedback).toBeUndefined();
  });

  it('exercise_id halluciné → rejet avec feedback mentionnant l\'ID', () => {
    const output = makeOutput();
    output.days[0].exercises[0].exercise_id = 'machine_inventee';

    const result = validateAIGeneratedProgram(output, makeContext());

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'unknown_exercise')).toBe(true);
    expect(result.feedback).toContain('machine_inventee');
    expect(result.feedback).toContain('days[0].exercises[0]');
  });

  it('progression hors ADR-006 → rejet', () => {
    const output = makeOutput();
    output.days[0].exercises[0].progression = 'wave_loading';

    const result = validateAIGeneratedProgram(output, makeContext());

    expect(result.valid).toBe(false);
    const error = result.errors.find((e) => e.code === 'invalid_progression');
    expect(error).toBeDefined();
    expect(error!.message).toContain('strength_fixed');
  });

  it('split incohérent avec la fréquence → rejet', () => {
    const result = validateAIGeneratedProgram(
      makeOutput({ split: 'push_pull_legs_x2' }),
      makeContext({ frequencyDays: 3 })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'invalid_split')).toBe(true);
  });

  it('nombre de jours ≠ fréquence → rejet', () => {
    const result = validateAIGeneratedProgram(makeOutput(), makeContext({ frequencyDays: 4, level: 'intermediate' }));

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'day_count_mismatch')).toBe(true);
    // le split 3j est aussi invalide pour 4j
    expect(result.errors.some((e) => e.code === 'invalid_split')).toBe(true);
  });

  it('matériel indisponible → rejet', () => {
    const result = validateAIGeneratedProgram(
      makeOutput(),
      makeContext({
        userConstraints: {
          equipmentAllowed: ['barbell'], // pas de bench ni rack
          forbiddenMuscles: [],
          forbiddenMorphoTags: [],
          maxSessionDurationMin: null,
        },
      })
    );

    expect(result.valid).toBe(false);
    const error = result.errors.find((e) => e.code === 'equipment_unavailable');
    expect(error).toBeDefined();
    expect(error!.message).toContain('bench');
  });

  it('muscle interdit (blessure) → rejet', () => {
    const result = validateAIGeneratedProgram(
      makeOutput(),
      makeContext({
        userConstraints: {
          equipmentAllowed: ['barbell', 'bench', 'rack'],
          forbiddenMuscles: ['quads'],
          forbiddenMorphoTags: [],
          maxSessionDurationMin: null,
        },
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'forbidden_exercise')).toBe(true);
  });

  it('tag morpho interdit → rejet', () => {
    const output = makeOutput();
    output.days[0].exercises[0].exercise_id = 'ohp';

    const result = validateAIGeneratedProgram(
      output,
      makeContext({
        userConstraints: {
          equipmentAllowed: ['barbell', 'bench', 'rack'],
          forbiddenMuscles: [],
          forbiddenMorphoTags: ['shoulder_risky'],
          maxSessionDurationMin: null,
        },
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'forbidden_exercise')).toBe(true);
  });

  it('séance trop longue vs maxSessionDurationMin → rejet', () => {
    const output = makeOutput();
    // 10 + 10 sets = 20 sets → 8 + 100 min estimé
    output.days[0].exercises[0].sets = 10;
    output.days[0].exercises[1].sets = 10;

    const result = validateAIGeneratedProgram(
      output,
      makeContext({
        userConstraints: {
          equipmentAllowed: ['barbell', 'bench', 'rack'],
          forbiddenMuscles: [],
          forbiddenMorphoTags: [],
          maxSessionDurationMin: 45,
        },
      })
    );

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'session_too_long')).toBe(true);
  });

  it.each([
    [{ weeks: 1 }, 'weeks'],
    [{ weeks: 20 }, 'weeks'],
    [{ split: '' }, 'split'],
  ])('schéma invalide %j → erreur sur %s', (patch, field) => {
    const result = validateAIGeneratedProgram(
      makeOutput(patch as Partial<AIIntermediateOutput>),
      makeContext()
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'schema_invalid' && e.field.startsWith(field))).toBe(true);
  });

  it('sets/reps/rir invalides et progression manquante → erreurs de schéma', () => {
    const output = makeOutput();
    output.days[0].exercises[0] = {
      exercise_id: 'bench_press',
      sets: 0,
      reps: '8-6',
      rir: 7,
      start_weight_kg: -5,
      progression: '',
    };

    const result = validateAIGeneratedProgram(output, makeContext());

    expect(result.valid).toBe(false);
    const fields = result.errors.map((e) => e.field);
    expect(fields.some((f) => f.endsWith('.sets'))).toBe(true);
    expect(fields.some((f) => f.endsWith('.reps'))).toBe(true);
    expect(fields.some((f) => f.endsWith('.rir'))).toBe(true);
    expect(fields.some((f) => f.endsWith('.start_weight_kg'))).toBe(true);
    expect(fields.some((f) => f.endsWith('.progression'))).toBe(true);
  });

  it('le feedback agrège toutes les erreurs bloquantes', () => {
    const output = makeOutput({ split: 'invented_split' });
    output.days[0].exercises[0].exercise_id = 'ghost';
    output.days[1].exercises[0].progression = 'wave';

    const result = validateAIGeneratedProgram(output, makeContext());

    expect(result.feedback).toContain('ghost');
    expect(result.feedback).toContain('invented_split');
    expect(result.feedback).toContain('wave');
  });
});

describe('validSplitsForFrequency', () => {
  it('retourne les splits §5.1 par fréquence', () => {
    expect(validSplitsForFrequency(3)).toEqual(['full_body_ab', 'full_body_abc']);
    expect(validSplitsForFrequency(4)).toEqual(['upper_lower', 'upper_lower_upper_focus']);
    expect(validSplitsForFrequency(5)).toEqual(['push_pull_legs', 'push_pull_legs_upper_lower']);
    expect(validSplitsForFrequency(6)).toEqual(['push_pull_legs_x2']);
    expect(validSplitsForFrequency(7)).toEqual([]);
  });
});
