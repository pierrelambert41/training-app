/**
 * Tests TA-136 — Explication d'ajustement à la demande (IA).
 *
 * Vérifie :
 * - Explication retournée et persistée dans metadata.ai_explanation après appel Claude nominal
 * - Fallback textuel déclenché si Claude retourne erreur
 * - Fallback textuel si supabase=null (offline)
 * - Throw si la recommendation n'existe pas
 * - UPDATE metadata (pas d'INSERT supplémentaire) — idempotence
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { explainAdjustment } from './explain-adjustment-service';

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

type MockDbState = {
  recommendation: Record<string, unknown> | null;
  runCalls: Array<{ sql: string; params: unknown[] }>;
};

function makeMockDb(state: MockDbState): SQLiteDatabase {
  return {
    getFirstAsync: jest.fn(async (sql: string, params: unknown[]) => {
      if ((sql as string).includes('FROM recommendations')) {
        const id = (params as string[])[0];
        if (state.recommendation && state.recommendation.id === id) {
          return state.recommendation;
        }
        return null;
      }
      return null;
    }),

    getAllAsync: jest.fn(async () => []),

    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      state.runCalls.push({ sql: sql as string, params });
      return { lastInsertRowId: 1, changes: 1 };
    }),

    execAsync: jest.fn(async () => {}),
  } as unknown as SQLiteDatabase;
}

function makeSupabaseOk(explanationText: string): SupabaseClient {
  return {
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ message: explanationText }),
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

function makeRecommendationRow(id: string): Record<string, unknown> {
  return {
    id,
    session_id: 'session-1',
    exercise_id: 'ex-bench',
    source: 'rules_engine',
    type: 'load_change',
    message: 'Augmentation recommandée : tu as atteint tes reps cibles.',
    next_load: 82.5,
    next_rep_target: 8,
    next_rir_target: 2,
    action: 'increase',
    confidence: 0.9,
    metadata: '{}',
    created_at: '2026-05-19T10:00:00Z',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('explainAdjustment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAIContextProfile.mockResolvedValue(minimalProfile);
  });

  it('retourne une explication et met à jour metadata.ai_explanation après appel Claude nominal', async () => {
    const state: MockDbState = {
      recommendation: makeRecommendationRow('reco-1'),
      runCalls: [],
    };
    const db = makeMockDb(state);

    const result = await explainAdjustment(
      db,
      'reco-1',
      'user-1',
      makeSupabaseOk('Excellente progression !')
    );

    expect(result).toBe('Excellente progression !');

    const updateCall = state.runCalls.find((c) =>
      c.sql.includes('UPDATE recommendations')
    );
    expect(updateCall).toBeDefined();
    const metadataStr = updateCall?.params.find(
      (p) => typeof p === 'string' && (p as string).includes('ai_explanation')
    ) as string | undefined;
    expect(metadataStr).toBeDefined();
    const metadata = JSON.parse(metadataStr!) as Record<string, unknown>;
    expect(metadata.ai_explanation).toBe('Excellente progression !');
    expect(metadata.ai_explanation_fallback).toBe(false);
  });

  it('retourne un fallback textuel et le persiste si Claude retourne erreur', async () => {
    const state: MockDbState = {
      recommendation: makeRecommendationRow('reco-2'),
      runCalls: [],
    };
    const db = makeMockDb(state);

    const result = await explainAdjustment(db, 'reco-2', 'user-1', makeSupabaseError());

    expect(result).toContain('Augmentation recommandée');

    const updateCall = state.runCalls.find((c) =>
      c.sql.includes('UPDATE recommendations')
    );
    expect(updateCall).toBeDefined();
    const metadataStr = updateCall?.params.find(
      (p) => typeof p === 'string' && (p as string).includes('ai_explanation_fallback')
    ) as string | undefined;
    expect(metadataStr).toBeDefined();
    const metadata = JSON.parse(metadataStr!) as Record<string, unknown>;
    expect(metadata.ai_explanation_fallback).toBe(true);
  });

  it('retourne un fallback textuel si supabase=null (offline)', async () => {
    const state: MockDbState = {
      recommendation: makeRecommendationRow('reco-3'),
      runCalls: [],
    };
    const db = makeMockDb(state);

    const result = await explainAdjustment(db, 'reco-3', 'user-1', null);

    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);

    const updateCall = state.runCalls.find((c) =>
      c.sql.includes('UPDATE recommendations')
    );
    expect(updateCall).toBeDefined();
    const metadataStr = updateCall?.params.find(
      (p) => typeof p === 'string' && (p as string).includes('ai_explanation')
    ) as string | undefined;
    expect(metadataStr).toBeDefined();
    const metadata = JSON.parse(metadataStr!) as Record<string, unknown>;
    expect(metadata.ai_explanation_fallback).toBe(true);
  });

  it("lève une erreur si la recommendation n'existe pas", async () => {
    const state: MockDbState = {
      recommendation: null,
      runCalls: [],
    };
    const db = makeMockDb(state);

    await expect(
      explainAdjustment(db, 'nonexistent', 'user-1', makeSupabaseOk('text'))
    ).rejects.toThrow('Recommendation not found: nonexistent');
  });

  it("utilise le profil par défaut si le profil IA est absent", async () => {
    mockGetAIContextProfile.mockResolvedValueOnce(null);

    const state: MockDbState = {
      recommendation: makeRecommendationRow('reco-5'),
      runCalls: [],
    };
    const db = makeMockDb(state);

    const result = await explainAdjustment(
      db,
      'reco-5',
      'user-1',
      makeSupabaseOk('Bonne progression !')
    );

    expect(result).toBe('Bonne progression !');
  });

  it('préserve les métadonnées existantes lors du UPDATE', async () => {
    const recWithMeta = {
      ...makeRecommendationRow('reco-6'),
      metadata: '{"existing_field":"keep_this"}',
    };
    const state: MockDbState = {
      recommendation: recWithMeta,
      runCalls: [],
    };
    const db = makeMockDb(state);

    await explainAdjustment(
      db,
      'reco-6',
      'user-1',
      makeSupabaseOk('Explication Claude')
    );

    const updateCall = state.runCalls.find((c) =>
      c.sql.includes('UPDATE recommendations')
    );
    const metadataStr = updateCall?.params.find(
      (p) => typeof p === 'string' && (p as string).includes('ai_explanation')
    ) as string | undefined;
    const metadata = JSON.parse(metadataStr!) as Record<string, unknown>;
    expect(metadata.existing_field).toBe('keep_this');
    expect(metadata.ai_explanation).toBe('Explication Claude');
  });
});
