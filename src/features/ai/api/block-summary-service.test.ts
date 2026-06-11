/**
 * Tests TA-138 — Résumé de bloc (IA).
 *
 * Vérifie :
 * - bloc de 4 sessions → BlockSummary retournée + Recommendation type 'summary' source 'ai' créée
 * - metadata.block_id présent (discriminant vs résumé de séance TA-135)
 * - appel répété → résultat en cache, pas de doublon ni de second appel Claude
 * - fallback métriques si supabase=null (offline) ou erreur Claude, avec fallback=true
 * - exercices en progression positive listés dans le fallback
 * - aucune session complétée → fallback sans INSERT (guard FK)
 * - SetLogs agrégés par (exercice, semaine) dans le contexte envoyé à Claude
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateBlockSummary, retryBlockSummary } from './block-summary-service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => 'test-uuid'),
}));

jest.mock('@/features/sync/api/safe-enqueue', () => ({
  safeEnqueue: jest.fn(async () => {}),
}));

const mockGetAIContextProfile = jest.fn();
jest.mock('./ai-context-service', () => ({
  getAIContextProfile: (...args: unknown[]) => mockGetAIContextProfile(...args),
}));

// ---------------------------------------------------------------------------
// Mock DB factory
// ---------------------------------------------------------------------------

type RunCall = { sql: string; params: unknown[] };

type RecommendationRow = Record<string, unknown>;

type MockDbState = {
  blockRow: Record<string, unknown> | null;
  sessionRows: Array<{ id: string; date: string }>;
  totalSessionCount: number;
  setLogsBySession: Record<string, Array<{ exercise_id: string; load: number; reps: number; completed: number }>>;
  recommendationRows: RecommendationRow[];
  exerciseName: string;
  insertCalls: RunCall[];
};

function makeMockDb(state: MockDbState): SQLiteDatabase {
  return {
    getAllAsync: jest.fn(async (sql: string, params: unknown[]) => {
      if (sql.includes('FROM sessions')) {
        return state.sessionRows;
      }
      if (sql.includes('FROM set_logs')) {
        return state.setLogsBySession[params[0] as string] ?? [];
      }
      if (sql.includes('FROM recommendations')) {
        return state.recommendationRows;
      }
      return [];
    }),

    getFirstAsync: jest.fn(async (sql: string) => {
      if (sql.includes('FROM blocks')) {
        return state.blockRow;
      }
      if (sql.includes('COUNT(*)')) {
        return { total: state.totalSessionCount };
      }
      if (sql.includes('FROM exercises')) {
        return { name: state.exerciseName };
      }
      return null;
    }),

    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      state.insertCalls.push({ sql, params });
      if (sql.includes('INSERT INTO recommendations')) {
        state.recommendationRows.push({
          id: params[0],
          session_id: params[1],
          exercise_id: params[2],
          source: params[3],
          type: params[4],
          message: params[5],
          next_load: params[6],
          next_rep_target: params[7],
          next_rir_target: params[8],
          action: params[9],
          confidence: params[10],
          metadata: params[11],
          created_at: params[12],
        });
      }
      return { lastInsertRowId: 1, changes: 1 };
    }),

    execAsync: jest.fn(async () => {}),
  } as unknown as SQLiteDatabase;
}

function makeSupabaseOk(summary: Record<string, unknown>): SupabaseClient {
  return {
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: {
          content: [{ type: 'text', text: JSON.stringify(summary) }],
        },
        error: null,
      }),
    },
  } as unknown as SupabaseClient;
}

function makeSupabaseError(): SupabaseClient {
  return {
    functions: {
      invoke: jest.fn().mockResolvedValue({ data: null, error: new Error('429') }),
    },
  } as unknown as SupabaseClient;
}

const minimalProfile = {
  version: 1,
  user: {
    level: 'intermediate',
    goals: { primary: 'hypertrophy' },
    training_frequency: 4,
    preferred_unit: 'kg',
  },
  morphology: { strong_points: [], weak_points: [], injury_history: [] },
  exercise_preferences: { preferred: [], avoided: [], constraints: [] },
  performance_baselines: {},
  recent_highlights: [],
  coaching_style: 'direct',
  parallel_sports: [],
};

const claudeSummary = {
  title: 'Bloc Hypertrophie 4 semaines',
  duration_weeks: 4,
  overall_assessment: 'Bon bloc avec progression régulière.',
  top_progressions: ['Squat +3kg e1RM'],
  stagnations: [],
  compliance_note: 'Taux de complétion 80%.',
  next_block_recommendation: 'Augmenter légèrement le volume.',
};

function makeState(): MockDbState {
  return {
    blockRow: {
      id: 'block-1',
      program_id: 'program-1',
      title: 'Bloc Hypertrophie',
      goal: 'hypertrophy',
      duration_weeks: 4,
      week_number: 4,
      start_date: '2026-04-01',
      end_date: '2026-04-28',
      status: 'completed',
      deload_strategy: 'fatigue_triggered',
      created_at: '2026-04-01T00:00:00Z',
      updated_at: '2026-04-28T00:00:00Z',
    },
    sessionRows: [
      { id: 'session-1', date: '2026-04-01' },
      { id: 'session-2', date: '2026-04-03' },
      { id: 'session-3', date: '2026-04-08' },
      { id: 'session-4', date: '2026-04-10' },
    ],
    totalSessionCount: 5,
    setLogsBySession: {
      'session-1': [{ exercise_id: 'ex-squat', load: 100, reps: 5, completed: 1 }],
      'session-2': [{ exercise_id: 'ex-squat', load: 100, reps: 6, completed: 1 }],
      'session-3': [{ exercise_id: 'ex-squat', load: 105, reps: 5, completed: 1 }],
      'session-4': [{ exercise_id: 'ex-squat', load: 105, reps: 6, completed: 1 }],
    },
    recommendationRows: [],
    exerciseName: 'Squat',
    insertCalls: [],
  };
}

function findRecommendationInsert(state: MockDbState): RunCall | undefined {
  return state.insertCalls.find((c) => c.sql.includes('INSERT INTO recommendations'));
}

function readInsertedMetadata(call: RunCall): Record<string, unknown> {
  return JSON.parse(call.params[11] as string) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateBlockSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAIContextProfile.mockResolvedValue(minimalProfile);
  });

  it('retourne la BlockSummary Claude et crée une Recommendation type summary source ai', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    const result = await generateBlockSummary(db, 'block-1', 'user-1', makeSupabaseOk(claudeSummary));

    expect(result.title).toBe('Bloc Hypertrophie 4 semaines');
    expect(result.top_progressions).toContain('Squat +3kg e1RM');

    const insertCall = findRecommendationInsert(state);
    expect(insertCall).toBeDefined();

    const params = insertCall!.params;
    expect(params[1]).toBe('session-4'); // session de clôture = dernière du bloc
    expect(params[2]).toBeNull(); // exercise_id null (résumé global)
    expect(params[3]).toBe('ai');
    expect(params[4]).toBe('summary');
  });

  it('inclut metadata.block_id pour discriminer du résumé de séance', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    await generateBlockSummary(db, 'block-1', 'user-1', makeSupabaseOk(claudeSummary));

    const metadata = readInsertedMetadata(findRecommendationInsert(state)!);
    expect(metadata.block_id).toBe('block-1');
    expect(metadata.fallback).toBe(false);
    expect(metadata.overall_assessment).toBe('Bon bloc avec progression régulière.');
  });

  it('appel répété → retourne le cache sans doublon ni nouvel appel Claude', async () => {
    const state = makeState();
    const db = makeMockDb(state);
    const supabaseMock = makeSupabaseOk(claudeSummary);

    const first = await generateBlockSummary(db, 'block-1', 'user-1', supabaseMock);
    const second = await generateBlockSummary(db, 'block-1', 'user-1', supabaseMock);

    expect(second).toEqual(first);
    const inserts = state.insertCalls.filter((c) => c.sql.includes('INSERT INTO recommendations'));
    expect(inserts).toHaveLength(1);
    expect(supabaseMock.functions.invoke as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it("ne confond pas un résumé de séance TA-135 (sans block_id) avec le cache du bloc", async () => {
    const state = makeState();
    state.recommendationRows.push({
      id: 'rec-session-summary',
      session_id: 'session-4',
      exercise_id: null,
      source: 'ai',
      type: 'summary',
      message: 'Résumé de séance',
      next_load: null,
      next_rep_target: null,
      next_rir_target: null,
      action: null,
      confidence: 0.9,
      metadata: JSON.stringify({ overall_rating: 'good' }),
      created_at: '2026-04-10T00:00:00Z',
    });
    const db = makeMockDb(state);
    const supabaseMock = makeSupabaseOk(claudeSummary);

    const result = await generateBlockSummary(db, 'block-1', 'user-1', supabaseMock);

    expect(result.title).toBe('Bloc Hypertrophie 4 semaines');
    expect(findRecommendationInsert(state)).toBeDefined();
    expect(supabaseMock.functions.invoke as jest.Mock).toHaveBeenCalledTimes(1);
  });

  it('fallback métriques si supabase=null : compliance, séances et progressions', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    const result = await generateBlockSummary(db, 'block-1', 'user-1', null);

    expect(result.title).toBe('Bloc Hypertrophie');
    expect(result.duration_weeks).toBe(4);
    expect(result.overall_assessment).toContain('4 séances complétées');
    expect(result.compliance_note).toContain('80%');
    expect(result.top_progressions.length).toBeGreaterThan(0);
    expect(result.top_progressions[0]).toContain('Squat');

    const metadata = readInsertedMetadata(findRecommendationInsert(state)!);
    expect(metadata.fallback).toBe(true);
  });

  it('fallback persisté avec fallback=true si Claude retourne une erreur', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    const result = await generateBlockSummary(db, 'block-1', 'user-1', makeSupabaseError());

    expect(result.overall_assessment).toContain('Analyse IA indisponible');
    const metadata = readInsertedMetadata(findRecommendationInsert(state)!);
    expect(metadata.fallback).toBe(true);
    expect(metadata.block_id).toBe('block-1');
  });

  it('aucune session complétée → fallback sans INSERT (guard FK)', async () => {
    const state = makeState();
    state.sessionRows = [];
    const db = makeMockDb(state);

    const result = await generateBlockSummary(db, 'block-1', 'user-1', makeSupabaseOk(claudeSummary));

    expect(result.title).toBe('Bloc Hypertrophie');
    expect(result.overall_assessment).toContain('0 séance');
    expect(findRecommendationInsert(state)).toBeUndefined();
  });

  it('bloc inexistant → throw', async () => {
    const state = makeState();
    state.blockRow = null;
    const db = makeMockDb(state);

    await expect(
      generateBlockSummary(db, 'block-ghost', 'user-1', null)
    ).rejects.toThrow('block not found');
  });

  it('agrège les SetLogs par exercice et par semaine dans le contexte Claude', async () => {
    const state = makeState();
    const db = makeMockDb(state);
    const supabaseMock = makeSupabaseOk(claudeSummary);

    await generateBlockSummary(db, 'block-1', 'user-1', supabaseMock);

    const invokeCall = (supabaseMock.functions.invoke as jest.Mock).mock.calls[0];
    const body = invokeCall[1].body as { messages: Array<{ content: string }> };
    const messageContent = body.messages[0].content;

    expect(messageContent).toContain('recentHistory');
    expect(messageContent).toContain('Squat');
    // 4 sessions réparties sur 2 semaines → 2 entrées agrégées, pas 4
    const aggregateCount = (messageContent.match(/"avgLoad"/g) ?? []).length;
    expect(aggregateCount).toBe(2);
    // semaine 1 : (100+100)/2 = 100 ; semaine 2 : (105+105)/2 = 105
    expect(messageContent).toContain('"avgLoad":100');
    expect(messageContent).toContain('"avgLoad":105');
  });
});

// ---------------------------------------------------------------------------
// TA-141 — enqueue du fallback + retryBlockSummary
// ---------------------------------------------------------------------------

describe('generateBlockSummary — enqueue retry (TA-141)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAIContextProfile.mockResolvedValue(minimalProfile);
  });

  it('fallback offline → entrée ai_retry_queue type block_summary', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    await generateBlockSummary(db, 'block-1', 'user-1', null);

    const enqueueCall = state.insertCalls.find((c) => c.sql.includes('INSERT INTO ai_retry_queue'));
    expect(enqueueCall).toBeDefined();
    expect(enqueueCall!.params).toContain('block_summary');
    const payload = (enqueueCall!.params as string[]).find(
      (p) => typeof p === 'string' && p.includes('blockId')
    );
    expect(JSON.parse(payload!)).toEqual({ blockId: 'block-1', userId: 'user-1' });
  });

  it('appel Claude nominal → pas d\'entrée retry', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    await generateBlockSummary(db, 'block-1', 'user-1', makeSupabaseOk(claudeSummary));

    expect(
      state.insertCalls.find((c) => c.sql.includes('INSERT INTO ai_retry_queue'))
    ).toBeUndefined();
  });
});

describe('retryBlockSummary', () => {
  function makeFallbackRec(): RecommendationRow {
    return {
      id: 'rec-fallback',
      session_id: 'session-4',
      exercise_id: null,
      source: 'ai',
      type: 'summary',
      message: 'Fallback',
      next_load: null,
      next_rep_target: null,
      next_rir_target: null,
      action: null,
      confidence: 0.3,
      metadata: JSON.stringify({ block_id: 'block-1', fallback: true }),
      created_at: '2026-04-10T00:00:00Z',
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAIContextProfile.mockResolvedValue(minimalProfile);
  });

  it('fallback existant + Claude OK → UPDATE de la Recommendation (remplace le fallback), retourne true', async () => {
    const state = makeState();
    const fallbackRec = makeFallbackRec();
    state.recommendationRows.push(fallbackRec);
    const db = makeMockDb(state);
    (db.getFirstAsync as jest.Mock).mockImplementation(async (sql: string) => {
      if (sql.includes('FROM blocks')) return state.blockRow;
      if (sql.includes('COUNT(*)')) return { total: state.totalSessionCount };
      if (sql.includes('FROM exercises')) return { name: state.exerciseName };
      if (sql.includes('FROM recommendations') && sql.includes('WHERE id')) return fallbackRec;
      return null;
    });

    const result = await retryBlockSummary(db, 'block-1', 'user-1', makeSupabaseOk(claudeSummary));

    expect(result).toBe(true);
    const updateCall = state.insertCalls.find((c) => c.sql.includes('UPDATE recommendations'));
    expect(updateCall).toBeDefined();
    const metadataParam = (updateCall!.params as string[]).find(
      (p) => typeof p === 'string' && p.includes('block_id')
    );
    const metadata = JSON.parse(metadataParam!) as Record<string, unknown>;
    expect(metadata.fallback).toBe(false);
    expect(metadata.overall_assessment).toBe('Bon bloc avec progression régulière.');
  });

  it('résumé non-fallback déjà présent → true sans appel Claude', async () => {
    const state = makeState();
    state.recommendationRows.push({
      ...makeFallbackRec(),
      metadata: JSON.stringify({ block_id: 'block-1', fallback: false }),
    });
    const db = makeMockDb(state);
    const supabaseMock = makeSupabaseOk(claudeSummary);

    const result = await retryBlockSummary(db, 'block-1', 'user-1', supabaseMock);

    expect(result).toBe(true);
    expect(supabaseMock.functions.invoke as jest.Mock).not.toHaveBeenCalled();
  });

  it('échec Claude → false, pas de fallback persisté', async () => {
    const state = makeState();
    state.recommendationRows.push(makeFallbackRec());
    const db = makeMockDb(state);

    const result = await retryBlockSummary(db, 'block-1', 'user-1', makeSupabaseError());

    expect(result).toBe(false);
    expect(
      state.insertCalls.find((c) => c.sql.includes('UPDATE recommendations'))
    ).toBeUndefined();
  });

  it('supabase null → false ; bloc disparu → true', async () => {
    const state = makeState();
    expect(await retryBlockSummary(makeMockDb(state), 'block-1', 'user-1', null)).toBe(false);

    const stateNoBlock = makeState();
    stateNoBlock.blockRow = null;
    expect(
      await retryBlockSummary(makeMockDb(stateNoBlock), 'block-ghost', 'user-1', makeSupabaseOk(claudeSummary))
    ).toBe(true);
  });
});
