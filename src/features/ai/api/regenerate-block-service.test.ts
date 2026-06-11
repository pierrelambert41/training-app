/**
 * Tests TA-144 — regenerateBlockWithAI (ClaudeProvider.regenerateBlock bout en bout).
 *
 * Vérifie :
 * - mock Edge Function nominal → Block valide ('planned', rattaché au programme,
 *   weekNumber en continuité) avec ≥ 60% d'exercices communs avec le bloc précédent
 * - le prompt envoyé contient les exercices du bloc précédent (stats réelles)
 * - double échec de validation → AIValidationExhaustedError
 * - bloc précédent introuvable → throw
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { regenerateBlockWithAI } from './regenerate-block-service';
import { AIValidationExhaustedError } from '../types/ai-generation';

jest.mock('@/utils/uuid', () => {
  let counter = 0;
  return { generateUUID: jest.fn(() => `uuid-${++counter}`) };
});

jest.mock('@/features/sync/api/safe-enqueue', () => ({
  safeEnqueue: jest.fn(async () => {}),
}));

jest.mock('./ai-context-service', () => ({
  getAIContextProfile: jest.fn(async () => null),
}));

const mockSearchExercises = jest.fn();
jest.mock('@/services/exercises', () => ({
  searchExercises: (...args: unknown[]) => mockSearchExercises(...args),
}));

function makeExercise(id: string) {
  return {
    id,
    name: id,
    nameFr: id,
    category: 'compound',
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

const catalogue = [
  makeExercise('bench_press'),
  makeExercise('squat'),
  makeExercise('row'),
  makeExercise('ohp'),
];

const blockRow = {
  id: 'block-prev',
  program_id: 'program-1',
  title: 'Bloc Hypertrophie 1',
  goal: 'hypertrophy',
  duration_weeks: 6,
  week_number: 1,
  start_date: '2026-04-01',
  end_date: null,
  status: 'completed',
  deload_strategy: 'fatigue_triggered',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-05-12T00:00:00Z',
};

function makeDb(): SQLiteDatabase {
  return {
    getFirstAsync: jest.fn(async (sql: string) => {
      if (sql.includes('FROM blocks')) return blockRow;
      if (sql.includes('COUNT(*) AS total')) return { total: 20, completed: 17 };
      if (sql.includes('FROM workout_days')) return { count: 3 };
      if (sql.includes('AVG(')) return { avg_fatigue: 5.1 };
      return null;
    }),
    getAllAsync: jest.fn(async (sql: string) => {
      if (sql.includes('FROM set_logs')) {
        return [
          { exercise_id: 'bench_press', exercise_name: 'bench_press', session_date: '2026-04-01', load: 80, reps: 8, completed: 1 },
          { exercise_id: 'squat', exercise_name: 'squat', session_date: '2026-04-01', load: 120, reps: 5, completed: 1 },
          { exercise_id: 'row', exercise_name: 'row', session_date: '2026-04-01', load: 70, reps: 10, completed: 1 },
        ];
      }
      return [];
    }),
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
  } as unknown as SQLiteDatabase;
}

// 3 jours (daysPerWeek = 3), split full_body_abc, 2 exercices conservés sur 3 (≈ 66%)
function validAIOutput() {
  const day = (name: string, ids: string[]) => ({
    name,
    exercises: ids.map((id) => ({
      exercise_id: id,
      sets: 3,
      reps: '6-8',
      rir: 2,
      start_weight_kg: 80,
      progression: 'double_progression',
    })),
  });
  return {
    split: 'full_body_abc',
    weeks: 6,
    reasoning: 'continuité',
    days: [
      day('Full Body A', ['bench_press', 'squat', 'row']),
      day('Full Body B', ['row', 'squat', 'ohp']),
      day('Full Body C', ['bench_press', 'ohp', 'squat']),
    ],
  };
}

function makeSupabase(outputs: Array<Record<string, unknown>>): SupabaseClient {
  const invoke = jest.fn();
  for (const o of outputs) {
    invoke.mockResolvedValueOnce({
      data: { content: [{ type: 'text', text: JSON.stringify(o) }] },
      error: null,
    });
  }
  return { functions: { invoke } } as unknown as SupabaseClient;
}

describe('regenerateBlockWithAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSearchExercises.mockResolvedValue(catalogue);
  });

  it('retourne un Block planned rattaché au programme, en continuité de semaine', async () => {
    const supabase = makeSupabase([validAIOutput()]);

    const result = await regenerateBlockWithAI(makeDb(), 'block-prev', 'user-1', 'end_of_block', supabase);

    expect(result.generationSource).toBe('ai');
    expect(result.block.programId).toBe('program-1');
    expect(result.block.status).toBe('planned');
    expect(result.block.weekNumber).toBe(7); // 1 + 6 semaines
    expect(result.block.goal).toBe('hypertrophy');
    expect(result.days).toHaveLength(3);

    // ≥ 60% d'exercices communs avec le bloc précédent (bench_press, squat, row)
    const newIds = new Set(result.days.flatMap((d) => d.plannedExercises.map((pe) => pe.exerciseId)));
    const previousIds = ['bench_press', 'squat', 'row'];
    const kept = previousIds.filter((id) => newIds.has(id)).length;
    expect(kept / previousIds.length).toBeGreaterThanOrEqual(0.6);
  });

  it('envoie les stats réelles du bloc précédent dans le prompt', async () => {
    const supabase = makeSupabase([validAIOutput()]);

    await regenerateBlockWithAI(makeDb(), 'block-prev', 'user-1', 'end_of_block', supabase);

    const body = (supabase.functions.invoke as jest.Mock).mock.calls[0][1].body as {
      system: Array<{ text: string; cache_control?: { type: string } }>;
      messages: Array<{ content: Array<{ text: string }> }>;
    };
    expect(body.system[0].cache_control).toEqual({ type: 'ephemeral' });

    const userText = body.messages[0].content[0].text;
    expect(userText).toContain('bench_press');
    expect(userText).toContain('compliance_rate');
    expect(userText).toContain('Bloc Hypertrophie 1');
  });

  it('double échec de validation → AIValidationExhaustedError', async () => {
    const invalid = { ...validAIOutput(), split: 'push_pull_legs_x2' }; // invalide pour 3 jours
    const supabase = makeSupabase([invalid, invalid]);

    await expect(
      regenerateBlockWithAI(makeDb(), 'block-prev', 'user-1', 'end_of_block', supabase)
    ).rejects.toBeInstanceOf(AIValidationExhaustedError);
  });

  it('bloc précédent introuvable → throw', async () => {
    const db = makeDb();
    (db.getFirstAsync as jest.Mock).mockResolvedValue(null);

    await expect(
      regenerateBlockWithAI(db, 'ghost', 'user-1', 'end_of_block', makeSupabase([validAIOutput()]))
    ).rejects.toThrow('block not found');
  });
});
