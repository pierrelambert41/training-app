/**
 * Tests TA-135 — Génération et persistance du résumé fin de séance (IA).
 *
 * Vérifie :
 * - Résumé persisté comme Recommendation type='summary', source='ai' après appel nominal
 * - Fallback déclenché et entrée queue créée si Claude retourne erreur
 * - Fallback immédiat si profil IA absent + refresh profil en arrière-plan
 * - Fallback immédiat si supabase=null (offline) + entrée queue créée
 * - Idempotence : si une Recommendation summary existe déjà, UPDATE plutôt qu'INSERT
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateAndStoreSessionSummary } from './session-summary-service';

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
const mockRefreshAIContextProfile = jest.fn(async () => ({}));
jest.mock('./ai-context-service', () => ({
  getAIContextProfile: (...args: unknown[]) => mockGetAIContextProfile(...args),
  refreshAIContextProfile: (...args: unknown[]) => mockRefreshAIContextProfile(...args),
}));

const mockFallbackGenerateSummary = jest.fn(async () => ({
  overall_rating: 'average' as const,
  summary: 'Résumé fallback',
  highlights: [],
  concerns: [],
  fatigue_note: 'Analyse indisponible.',
  next_session_note: 'Continuez.',
}));

jest.mock('./fallback-provider', () => ({
  FallbackProvider: jest.fn().mockImplementation(() => ({
    generateSessionSummary: mockFallbackGenerateSummary,
  })),
}));

const mockEnqueueAIRetry = jest.fn(async () => {});
jest.mock('./retry-queue', () => ({
  enqueueAIRetry: (...args: unknown[]) => mockEnqueueAIRetry(...args),
}));

// ---------------------------------------------------------------------------
// Mock DB factory
// ---------------------------------------------------------------------------

type MockDbState = {
  session: Record<string, unknown> | null;
  setLogs: Record<string, unknown>[];
  recommendations: Record<string, unknown>[];
  runCalls: Array<{ sql: string; params: unknown[] }>;
};

function makeMockDb(state: MockDbState): SQLiteDatabase {
  return {
    getFirstAsync: jest.fn(async (sql: string, params: unknown[]) => {
      if ((sql as string).includes('FROM sessions') && (sql as string).includes('WHERE id = ?') && !(sql as string).includes('workout_day_id')) {
        return state.session;
      }
      if ((sql as string).includes('FROM sessions') && (sql as string).includes('workout_day_id')) {
        return null;
      }
      if ((sql as string).includes('FROM exercises')) {
        return { id: (params as string[])[0], name: 'Bench Press' };
      }
      if ((sql as string).includes('FROM recommendations') && (sql as string).includes('WHERE id')) {
        return state.recommendations.find((r) => r.id === (params as string[])[0]) ?? null;
      }
      return null;
    }),

    getAllAsync: jest.fn(async (sql: string, params: unknown[]) => {
      if ((sql as string).includes('set_logs')) return state.setLogs;
      if ((sql as string).includes('recommendations')) {
        if (params && (params as string[])[0]) {
          return state.recommendations.filter(
            (r) => r.session_id === (params as string[])[0]
          );
        }
        return state.recommendations;
      }
      return [];
    }),

    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      state.runCalls.push({ sql: sql as string, params });
      return { lastInsertRowId: 1, changes: 1 };
    }),

    execAsync: jest.fn(async () => {}),
  } as unknown as SQLiteDatabase;
}

function makeSupabaseOk(): SupabaseClient {
  return {
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                overall_rating: 'good',
                summary: 'Bonne séance IA',
                highlights: ['PR bench'],
                concerns: [],
                fatigue_note: 'Fatigue modérée.',
                next_session_note: 'Maintenir la charge.',
              }),
            },
          ],
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

function makeSession(id: string): Record<string, unknown> {
  return {
    id,
    user_id: 'user-1',
    workout_day_id: null,
    date: '2026-05-19',
    status: 'completed',
    readiness: null,
    energy: null,
    sleep_quality: null,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateAndStoreSessionSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAIContextProfile.mockResolvedValue(minimalProfile);
    mockRefreshAIContextProfile.mockResolvedValue({});
    mockFallbackGenerateSummary.mockResolvedValue({
      overall_rating: 'average',
      summary: 'Résumé fallback',
      highlights: [],
      concerns: [],
      fatigue_note: 'Analyse indisponible.',
      next_session_note: 'Continuez.',
    });
    mockEnqueueAIRetry.mockResolvedValue(undefined);
  });

  it('insère une Recommendation type=summary source=ai après appel Claude nominal', async () => {
    const state: MockDbState = {
      session: makeSession('session-1'),
      setLogs: [],
      recommendations: [],
      runCalls: [],
    };
    const db = makeMockDb(state);

    await generateAndStoreSessionSummary(db, 'session-1', 'user-1', makeSupabaseOk());

    const insertCall = state.runCalls.find((c) =>
      c.sql.includes('INSERT INTO recommendations')
    );
    expect(insertCall).toBeDefined();
    expect(insertCall?.params).toContain('summary');
    expect(insertCall?.params).toContain('ai');
    expect(mockEnqueueAIRetry).not.toHaveBeenCalled();
  });

  it('déclenche FallbackProvider et crée une entrée retry si Claude retourne erreur', async () => {
    const state: MockDbState = {
      session: makeSession('session-2'),
      setLogs: [],
      recommendations: [],
      runCalls: [],
    };
    const db = makeMockDb(state);

    await generateAndStoreSessionSummary(db, 'session-2', 'user-1', makeSupabaseError());

    expect(mockFallbackGenerateSummary).toHaveBeenCalled();

    const insertCall = state.runCalls.find((c) =>
      c.sql.includes('INSERT INTO recommendations')
    );
    expect(insertCall).toBeDefined();

    expect(mockEnqueueAIRetry).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        sessionId: 'session-2',
        type: 'session_summary',
      })
    );
  });

  it('utilise FallbackProvider et enqueue retry si profil IA absent', async () => {
    mockGetAIContextProfile.mockResolvedValueOnce(null);

    const state: MockDbState = {
      session: makeSession('session-3'),
      setLogs: [],
      recommendations: [],
      runCalls: [],
    };
    const db = makeMockDb(state);

    await generateAndStoreSessionSummary(db, 'session-3', 'user-1', makeSupabaseOk());

    expect(mockFallbackGenerateSummary).toHaveBeenCalled();
    expect(mockEnqueueAIRetry).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        sessionId: 'session-3',
        type: 'session_summary',
      })
    );
  });

  it('déclenche refreshAIContextProfile en arrière-plan si profil absent', async () => {
    mockGetAIContextProfile.mockResolvedValueOnce(null);

    const state: MockDbState = {
      session: makeSession('session-4'),
      setLogs: [],
      recommendations: [],
      runCalls: [],
    };
    const db = makeMockDb(state);

    await generateAndStoreSessionSummary(db, 'session-4', 'user-1', makeSupabaseOk());

    expect(mockRefreshAIContextProfile).toHaveBeenCalledWith(db, 'user-1');
  });

  it('utilise FallbackProvider et enqueue retry si supabase=null (offline)', async () => {
    const state: MockDbState = {
      session: makeSession('session-5'),
      setLogs: [],
      recommendations: [],
      runCalls: [],
    };
    const db = makeMockDb(state);

    await generateAndStoreSessionSummary(db, 'session-5', 'user-1', null);

    expect(mockFallbackGenerateSummary).toHaveBeenCalled();
    expect(mockEnqueueAIRetry).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        sessionId: 'session-5',
        type: 'session_summary',
      })
    );
  });

  it('retourne void sans erreur si la session est introuvable', async () => {
    const state: MockDbState = {
      session: null,
      setLogs: [],
      recommendations: [],
      runCalls: [],
    };
    const db = makeMockDb(state);

    await expect(
      generateAndStoreSessionSummary(db, 'nonexistent', 'user-1', makeSupabaseOk())
    ).resolves.not.toThrow();
  });

  it('UPDATE la recommendation existante si un résumé IA existe déjà (idempotence)', async () => {
    const existingRec = {
      id: 'existing-summary-id',
      session_id: 'session-6',
      exercise_id: null,
      source: 'ai',
      type: 'summary',
      message: 'Ancien résumé fallback',
      next_load: null,
      next_rep_target: null,
      next_rir_target: null,
      action: null,
      confidence: 0.3,
      metadata: '{"fallback":true}',
      created_at: '2026-05-19T10:00:00Z',
    };

    const state: MockDbState = {
      session: makeSession('session-6'),
      setLogs: [],
      recommendations: [existingRec],
      runCalls: [],
    };
    const db = makeMockDb(state);

    (db.getFirstAsync as jest.Mock).mockImplementation(async (sql: string, params: unknown[]) => {
      if ((sql as string).includes('FROM sessions') && (sql as string).includes('WHERE id = ?') && !(sql as string).includes('workout_day_id')) {
        return state.session;
      }
      if ((sql as string).includes('FROM recommendations') && (sql as string).includes('WHERE id')) {
        return existingRec;
      }
      return null;
    });

    await generateAndStoreSessionSummary(db, 'session-6', 'user-1', makeSupabaseOk());

    const updateCall = state.runCalls.find((c) =>
      c.sql.includes('UPDATE recommendations')
    );
    expect(updateCall).toBeDefined();

    const insertNewCall = state.runCalls.find(
      (c) =>
        c.sql.includes('INSERT INTO recommendations') &&
        (c.params as string[]).includes('session-6')
    );
    expect(insertNewCall).toBeUndefined();
  });
});
