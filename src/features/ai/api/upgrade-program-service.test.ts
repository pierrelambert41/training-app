/**
 * Tests TA-146 — upgradeFallbackProgramToAI (remplacement fallback → IA).
 *
 * Vérifie :
 * - succès : blocs planned supprimés (cascade), bloc IA inséré en 'planned'
 *   (bloc actif conservé), program.generation_source → 'ai', COMMIT
 * - sans bloc actif : le bloc IA est inséré en 'active'
 * - échec IA → aucune écriture (pas de BEGIN)
 * - échec d'insertion → ROLLBACK et erreur propagée
 * - rebuildQuestionnaireFromProgram : reconstruit depuis programme + profil
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  rebuildQuestionnaireFromProgram,
  upgradeFallbackProgramToAI,
} from './upgrade-program-service';

jest.mock('@/features/sync/api/safe-enqueue', () => ({
  safeEnqueue: jest.fn(async () => {}),
}));

jest.mock('./ai-context-service', () => ({
  getAIContextProfile: jest.fn(async () => null),
}));

const mockGenerateProgramWithAI = jest.fn();
jest.mock('./generate-program-service', () => ({
  generateProgramWithAI: (...args: unknown[]) => mockGenerateProgramWithAI(...args),
}));

const programRow = {
  id: 'program-1',
  user_id: 'user-1',
  title: 'Hypertrophie — full body abc',
  goal: 'hypertrophy',
  frequency: 3,
  level: 'intermediate',
  is_active: 1,
  generation_source: 'fallback',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
};

const activeBlockRow = {
  id: 'block-active',
  program_id: 'program-1',
  title: 'Bloc initial',
  goal: 'hypertrophy',
  duration_weeks: 6,
  week_number: 1,
  start_date: '2026-06-01',
  end_date: null,
  status: 'active',
  deload_strategy: 'fatigue_triggered',
  generation_source: 'fallback',
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-01T00:00:00Z',
};

function aiResult() {
  return {
    program: { id: 'ai-program', userId: 'user-1', title: 'IA', goal: 'hypertrophy', frequency: 3, level: 'intermediate', isActive: true },
    block: { id: 'ai-block', programId: 'ai-program', title: 'Bloc initial', goal: 'hypertrophy', durationWeeks: 6, weekNumber: 1, status: 'active' },
    days: [
      {
        day: { id: 'ai-day-1', blockId: 'ai-block', title: 'Full Body A', dayOrder: 0, splitType: 'full', estimatedDurationMin: 50 },
        plannedExercises: [
          {
            id: 'ai-pe-1', workoutDayId: 'ai-day-1', exerciseId: 'bench_press', exerciseOrder: 0,
            role: 'main', sets: 4, repRangeMin: 6, repRangeMax: 8, targetRir: 2, restSeconds: 180,
            tempo: null, progressionType: 'double_progression', progressionConfig: {}, notes: null, isUnplanned: false,
          },
        ],
      },
    ],
    split: 'full_body_abc',
    warnings: [],
    generationSource: 'ai' as const,
  };
}

type Call = { sql: string; params?: unknown[] };

function makeDb(opts: { hasActiveBlock?: boolean; failOnInsertBlock?: boolean } = {}): {
  db: SQLiteDatabase;
  calls: Call[];
  execCalls: string[];
} {
  const calls: Call[] = [];
  const execCalls: string[] = [];
  const db = {
    getFirstAsync: jest.fn(async (sql: string) => {
      if (sql.includes('FROM programs')) return programRow;
      return null;
    }),
    getAllAsync: jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM blocks') && (params as string[])[1] === 'active') {
        return opts.hasActiveBlock === false ? [] : [activeBlockRow];
      }
      return [];
    }),
    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      if (opts.failOnInsertBlock && sql.includes('INSERT INTO blocks')) {
        throw new Error('insert failed');
      }
      calls.push({ sql, params });
      return { lastInsertRowId: 1, changes: 1 };
    }),
    execAsync: jest.fn(async (sql: string) => {
      execCalls.push(sql);
    }),
  } as unknown as SQLiteDatabase;
  return { db, calls, execCalls };
}

const supabase = {} as SupabaseClient;

describe('upgradeFallbackProgramToAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateProgramWithAI.mockResolvedValue(aiResult());
  });

  it('remplace les blocs planned, conserve le bloc actif, bascule le programme en ai', async () => {
    const { db, calls, execCalls } = makeDb();

    await upgradeFallbackProgramToAI(db, 'program-1', 'user-1', supabase);

    // cascade de suppression des planned uniquement
    const deletes = calls.filter((c) => c.sql.startsWith('DELETE'));
    expect(deletes).toHaveLength(3);
    expect(deletes.every((c) => c.sql.includes("'planned'"))).toBe(true);

    // bloc IA inséré en 'planned' (un bloc actif existe), rattaché au programme existant
    const blockInsert = calls.find((c) => c.sql.includes('INSERT INTO blocks'));
    expect(blockInsert).toBeDefined();
    expect(blockInsert!.params).toContain('program-1');
    expect(blockInsert!.params).toContain('planned');
    expect(blockInsert!.params).toContain('ai');

    // jours + exercices insérés
    expect(calls.some((c) => c.sql.includes('INSERT INTO workout_days'))).toBe(true);
    expect(calls.some((c) => c.sql.includes('INSERT INTO planned_exercises'))).toBe(true);

    // programme basculé en 'ai'
    const programUpdate = calls.find((c) => c.sql.includes('UPDATE programs'));
    expect(programUpdate).toBeDefined();
    expect(programUpdate!.params).toContain('ai');

    expect(execCalls).toEqual(['BEGIN TRANSACTION', 'COMMIT']);
  });

  it("sans bloc actif : le bloc IA est inséré en 'active'", async () => {
    const { db, calls } = makeDb({ hasActiveBlock: false });

    await upgradeFallbackProgramToAI(db, 'program-1', 'user-1', supabase);

    const blockInsert = calls.find((c) => c.sql.includes('INSERT INTO blocks'));
    expect(blockInsert!.params).toContain('active');
  });

  it('échec IA → aucune écriture, pas de transaction', async () => {
    mockGenerateProgramWithAI.mockRejectedValue(new Error('rate limited'));
    const { db, calls, execCalls } = makeDb();

    await expect(
      upgradeFallbackProgramToAI(db, 'program-1', 'user-1', supabase)
    ).rejects.toThrow('rate limited');

    expect(calls.filter((c) => c.sql.startsWith('DELETE'))).toHaveLength(0);
    expect(execCalls).toEqual([]);
  });

  it("échec d'insertion → ROLLBACK et erreur propagée (tout ou rien)", async () => {
    const { db, execCalls } = makeDb({ failOnInsertBlock: true });

    await expect(
      upgradeFallbackProgramToAI(db, 'program-1', 'user-1', supabase)
    ).rejects.toThrow('insert failed');

    expect(execCalls).toEqual(['BEGIN TRANSACTION', 'ROLLBACK']);
  });

  it('programme introuvable → throw', async () => {
    const { db } = makeDb();
    (db.getFirstAsync as jest.Mock).mockResolvedValue(null);

    await expect(
      upgradeFallbackProgramToAI(db, 'ghost', 'user-1', supabase)
    ).rejects.toThrow('program not found');
  });
});

describe('rebuildQuestionnaireFromProgram', () => {
  it('reconstruit goal/fréquence/niveau du programme et contraintes du profil', () => {
    const questionnaire = rebuildQuestionnaireFromProgram(
      {
        id: 'p1', userId: 'u1', title: 'T', goal: 'strength', frequency: 4, level: 'advanced',
        isActive: true, generationSource: 'fallback',
        createdAt: '2026-06-01T00:00:00Z', updatedAt: '2026-06-01T00:00:00Z',
      },
      {
        version: 1,
        user: { level: 'advanced', goals: { primary: 'strength' }, training_frequency: 4, preferred_unit: 'kg', weight_kg: 82 },
        morphology: { strong_points: [], weak_points: [], injury_history: ['épaule droite'] },
        exercise_preferences: { preferred: [], avoided: ['leg press'], constraints: [] },
        performance_baselines: {},
        recent_highlights: [],
        coaching_style: 'direct',
        parallel_sports: ['escalade'],
      }
    );

    expect(questionnaire.goal).toBe('strength');
    expect(questionnaire.frequencyDays).toBe(4);
    expect(questionnaire.level).toBe('advanced');
    expect(questionnaire.injuries).toBe('épaule droite');
    expect(questionnaire.avoidExercises).toBe('leg press');
    expect(questionnaire.sportsParallel).toBe('escalade');
    expect(questionnaire.weightKg).toBe('82');
  });
});
