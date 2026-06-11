/**
 * Tests TA-142 — generateProgramWithAI (ClaudeProvider.generateProgram bout en bout).
 *
 * Vérifie :
 * - mock Edge Function nominal → AIGenerationResult valide après transformation (source 'ai')
 * - transport : system en blocs (catalogue + cache_control) transmis à ai-proxy
 * - 1re sortie invalide → retry avec feedback injecté → 2e sortie valide
 * - double échec de validation → AIValidationExhaustedError (2 appels max)
 * - erreur HTTP 429 → AIProviderError code 'rate_limited', aucun retry
 * - réponse vide → AIProviderError 'invalid_response'
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateProgramWithAI } from './generate-program-service';
import { AIProviderError, AIValidationExhaustedError } from '../types/ai-generation';
import type { ProgramQuestionnaire } from '@/types';

jest.mock('@/utils/uuid', () => {
  let counter = 0;
  return { generateUUID: jest.fn(() => `uuid-${++counter}`) };
});

jest.mock('./ai-context-service', () => ({
  getAIContextProfile: jest.fn(async () => null),
}));

const mockSearchExercises = jest.fn();
jest.mock('@/services/exercises', () => ({
  searchExercises: (...args: unknown[]) => mockSearchExercises(...args),
}));

function makeExercise(id: string, category = 'compound', movementPattern = 'horizontal_push') {
  return {
    id,
    name: id,
    nameFr: id,
    category,
    movementPattern,
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

const catalogue = [
  makeExercise('bench_press'),
  makeExercise('squat', 'compound', 'squat'),
  makeExercise('row', 'compound', 'horizontal_pull'),
  makeExercise('rdl', 'compound', 'hinge'),
  makeExercise('pullup', 'compound', 'vertical_pull'),
  makeExercise('ohp', 'compound', 'vertical_push'),
  makeExercise('lunge', 'compound', 'unilateral_quad'),
];

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
  maxSessionDurationMin: null,
  mixedPriority: null,
  volumeTolerance: 'medium',
  importHistory: false,
  weightKg: '',
  heightCm: '',
};

function validAIOutput() {
  const day = (name: string) => ({
    name,
    exercises: [
      { exercise_id: 'bench_press', sets: 4, reps: '6-8', rir: 2, start_weight_kg: 80, progression: 'double_progression' },
      { exercise_id: 'squat', sets: 3, reps: '5', rir: 2, start_weight_kg: 100, progression: 'strength_fixed' },
    ],
  });
  return {
    split: 'full_body_abc',
    weeks: 6,
    reasoning: 'ok',
    days: [day('Full Body A'), day('Full Body B'), day('Full Body C')],
  };
}

function makeSupabase(responses: Array<Record<string, unknown> | 'error429' | 'empty'>): SupabaseClient {
  const invoke = jest.fn();
  for (const r of responses) {
    if (r === 'error429') {
      invoke.mockResolvedValueOnce({
        data: null,
        error: { name: 'FunctionsHttpError', message: 'rate limited', context: { status: 429 } },
      });
    } else if (r === 'empty') {
      invoke.mockResolvedValueOnce({ data: { content: [] }, error: null });
    } else {
      invoke.mockResolvedValueOnce({
        data: { content: [{ type: 'text', text: JSON.stringify(r) }] },
        error: null,
      });
    }
  }
  return { functions: { invoke } } as unknown as SupabaseClient;
}

const db = {} as SQLiteDatabase;

describe('generateProgramWithAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchExercises.mockResolvedValue(catalogue);
  });

  it('mock Edge Function nominal → AIGenerationResult valide (source ai)', async () => {
    const supabase = makeSupabase([validAIOutput()]);

    const result = await generateProgramWithAI(db, 'user-1', questionnaire, supabase);

    expect(result.generationSource).toBe('ai');
    expect(result.program.userId).toBe('user-1');
    expect(result.program.title).toContain('Hypertrophie');
    expect(result.block.durationWeeks).toBe(6);
    expect(result.days).toHaveLength(3);
    expect(result.days[0].plannedExercises).toHaveLength(2);
    expect(result.days[0].plannedExercises[0].progressionType).toBe('double_progression');
    expect(result.split).toBe('full_body_abc');
    expect((supabase.functions.invoke as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it('transmet le system en blocs avec le catalogue en cache_control ephemeral', async () => {
    const supabase = makeSupabase([validAIOutput()]);

    await generateProgramWithAI(db, 'user-1', questionnaire, supabase);

    const body = (supabase.functions.invoke as jest.Mock).mock.calls[0][1].body as {
      system: Array<{ text: string; cache_control?: { type: string } }>;
      max_tokens: number;
    };
    expect(Array.isArray(body.system)).toBe(true);
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(body.system[0].text).toContain('bench_press');
    expect(body.max_tokens).toBeGreaterThanOrEqual(3000);
  });

  it('1re sortie invalide → retry avec feedback, 2e valide → résultat retourné', async () => {
    const invalid = { ...validAIOutput(), split: 'push_pull_legs_x2' }; // invalide pour 3 jours
    const supabase = makeSupabase([invalid, validAIOutput()]);

    const result = await generateProgramWithAI(db, 'user-1', questionnaire, supabase);

    expect(result.split).toBe('full_body_abc');
    const invoke = supabase.functions.invoke as jest.Mock;
    expect(invoke).toHaveBeenCalledTimes(2);

    const retryBody = invoke.mock.calls[1][1].body as {
      messages: Array<{ role: string; content: Array<{ text: string }> }>;
    };
    const lastMessage = retryBody.messages[retryBody.messages.length - 1];
    expect(lastMessage.role).toBe('user');
    expect(lastMessage.content[0].text).toContain('rejeté');
    expect(lastMessage.content[0].text).toContain('push_pull_legs_x2');
  });

  it('double échec de validation → AIValidationExhaustedError, 2 appels max', async () => {
    const invalid = { ...validAIOutput(), split: 'push_pull_legs_x2' };
    const supabase = makeSupabase([invalid, invalid]);

    await expect(
      generateProgramWithAI(db, 'user-1', questionnaire, supabase)
    ).rejects.toBeInstanceOf(AIValidationExhaustedError);
    expect((supabase.functions.invoke as jest.Mock)).toHaveBeenCalledTimes(2);
  });

  it("erreur HTTP 429 → AIProviderError 'rate_limited', aucun retry", async () => {
    const supabase = makeSupabase(['error429']);

    const promise = generateProgramWithAI(db, 'user-1', questionnaire, supabase);

    await expect(promise).rejects.toBeInstanceOf(AIProviderError);
    await promise.catch((e: AIProviderError) => {
      expect(e.code).toBe('rate_limited');
    });
    expect((supabase.functions.invoke as jest.Mock)).toHaveBeenCalledTimes(1);
  });

  it("réponse vide → AIProviderError 'invalid_response'", async () => {
    const supabase = makeSupabase(['empty']);

    await generateProgramWithAI(db, 'user-1', questionnaire, supabase).catch((e: AIProviderError) => {
      expect(e).toBeInstanceOf(AIProviderError);
      expect(e.code).toBe('invalid_response');
    });
  });
});

// ---------------------------------------------------------------------------
// TA-145 — generateProgramWithFallback (pipeline partagé, source fallback)
// ---------------------------------------------------------------------------

import { generateProgramWithFallback } from './generate-program-service';

describe('generateProgramWithFallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchExercises.mockResolvedValue(catalogue);
  });

  it('génère via le moteur Phase 3 et annote generationSource: fallback', async () => {
    const result = await generateProgramWithFallback(db, 'user-1', questionnaire);

    expect(result.generationSource).toBe('fallback');
    expect(result.program.userId).toBe('user-1');
    expect(result.days).toHaveLength(3);
    for (const draft of result.days) {
      expect(draft.plannedExercises.length).toBeGreaterThan(0);
      for (const pe of draft.plannedExercises) {
        expect(catalogue.some((c) => c.id === pe.exerciseId)).toBe(true);
      }
    }
  });
});
