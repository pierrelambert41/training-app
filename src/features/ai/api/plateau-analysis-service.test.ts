/**
 * Tests TA-137 — Analyse de plateau à la demande (IA).
 *
 * Verifie :
 * - PlateauAnalysis retournee + Recommendation type 'plateau' cree apres appel Claude nominal
 * - Fallback avec suggestions standards si Claude retourne erreur
 * - Fallback si supabase=null (offline)
 * - Recommendation.type === 'plateau' et source === 'ai' dans tous les cas
 * - fallback: true dans metadata quand supabase=null ou erreur Claude
 * - historySessions vide → retourne fallback sans INSERT (guard FK)
 * - recovery_logs inclus dans le contexte envoyé à Claude
 * - parsePlateauAnalysis avec JSON tronqué → fallback (non-bloquant)
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { analyzePlateau } from './plateau-analysis-service';

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

type MockDbState = {
  sessionRows: Array<{ id: string; date: string }>;
  setLogRows: Array<{ load: number; reps: number; rir: number | null; completed: number }>;
  recoveryLogRows: Array<{ date: string; sleep_quality: number | null; energy: number | null; soreness: number | null; notes: string | null }>;
  exerciseName: string;
  insertCalls: RunCall[];
};

function makeMockDb(state: MockDbState): SQLiteDatabase {
  return {
    getAllAsync: jest.fn(async (sql: string, _params: unknown[]) => {
      if ((sql as string).includes('FROM sessions') && (sql as string).includes('JOIN set_logs')) {
        return state.sessionRows;
      }
      if ((sql as string).includes('FROM set_logs')) {
        return state.setLogRows;
      }
      if ((sql as string).includes('FROM recovery_logs')) {
        return state.recoveryLogRows;
      }
      return [];
    }),

    getFirstAsync: jest.fn(async (sql: string) => {
      if ((sql as string).includes('FROM exercises')) {
        return { name: state.exerciseName };
      }
      return null;
    }),

    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      state.insertCalls.push({ sql: sql as string, params });
      return { lastInsertRowId: 1, changes: 1 };
    }),

    execAsync: jest.fn(async () => {}),
  } as unknown as SQLiteDatabase;
}

function makeSupabaseOk(analysis: Record<string, unknown>): SupabaseClient {
  return {
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: {
          content: [{ type: 'text', text: JSON.stringify(analysis) }],
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

const claudeAnalysis = {
  exercise: 'Squat',
  plateau_duration_weeks: 3,
  probable_causes: ['fatigue cumulee', 'running impact'],
  suggestions: [
    'Reduire le volume cardio jambes cette semaine',
    "Essayer une variante (pause squat)",
    "Verifier la profondeur d'execution",
  ],
};

function makeState(): MockDbState {
  return {
    sessionRows: [
      { id: 'session-1', date: '2026-05-12' },
      { id: 'session-2', date: '2026-05-05' },
    ],
    setLogRows: [
      { load: 100, reps: 5, rir: 2, completed: 1 },
      { load: 100, reps: 5, rir: 1, completed: 1 },
    ],
    recoveryLogRows: [
      { date: '2026-05-06', sleep_quality: 7, energy: 6, soreness: 4, notes: null },
      { date: '2026-05-11', sleep_quality: 8, energy: 7, soreness: 3, notes: 'bonne nuit' },
    ],
    exerciseName: 'Squat',
    insertCalls: [],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('analyzePlateau', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAIContextProfile.mockResolvedValue(minimalProfile);
  });

  it('retourne la PlateauAnalysis Claude et cree une Recommendation type plateau', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    const result = await analyzePlateau(db, 'ex-squat', 'user-1', makeSupabaseOk(claudeAnalysis));

    expect(result.exercise).toBe('Squat');
    expect(result.plateau_duration_weeks).toBe(3);
    expect(result.probable_causes).toContain('fatigue cumulee');
    expect(result.suggestions.length).toBeGreaterThan(0);

    const insertCall = state.insertCalls.find((c) => c.sql.includes('INSERT INTO recommendations'));
    expect(insertCall).toBeDefined();

    const params = insertCall!.params as string[];
    expect(params).toContain('plateau');
    expect(params).toContain('ai');
    expect(params).toContain('ex-squat');
  });

  it('cree une Recommendation avec metadata.fallback=false apres appel Claude nominal', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    await analyzePlateau(db, 'ex-squat', 'user-1', makeSupabaseOk(claudeAnalysis));

    const insertCall = state.insertCalls.find((c) => c.sql.includes('INSERT INTO recommendations'));
    const metadataParam = (insertCall!.params as string[]).find(
      (p) => typeof p === 'string' && (p as string).includes('suggestions')
    );
    expect(metadataParam).toBeDefined();
    const metadata = JSON.parse(metadataParam!) as Record<string, unknown>;
    expect(metadata.fallback).toBe(false);
  });

  it('retourne les suggestions standards du fallback si Claude retourne erreur', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    const result = await analyzePlateau(db, 'ex-squat', 'user-1', makeSupabaseError());

    expect(result.suggestions).toContain("Vérifier la technique d'exécution");
    expect(result.suggestions).toContain("Proposer une variante de l'exercice");
    expect(result.suggestions).toContain('Ajuster le rep range');
    expect(result.suggestions).toContain('Modifier le tempo');
  });

  it('persiste la Recommendation avec fallback=true quand Claude retourne erreur', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    await analyzePlateau(db, 'ex-squat', 'user-1', makeSupabaseError());

    const insertCall = state.insertCalls.find((c) => c.sql.includes('INSERT INTO recommendations'));
    expect(insertCall).toBeDefined();
    const metadataParam = (insertCall!.params as string[]).find(
      (p) => typeof p === 'string' && (p as string).includes('fallback')
    );
    const metadata = JSON.parse(metadataParam!) as Record<string, unknown>;
    expect(metadata.fallback).toBe(true);
  });

  it('retourne les suggestions standards du fallback si supabase=null (offline)', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    const result = await analyzePlateau(db, 'ex-squat', 'user-1', null);

    expect(result.suggestions).toContain("Vérifier la technique d'exécution");
    expect(result.suggestions).toContain('Modifier le tempo');

    const insertCall = state.insertCalls.find((c) => c.sql.includes('INSERT INTO recommendations'));
    expect(insertCall).toBeDefined();
    const metadataParam = (insertCall!.params as string[]).find(
      (p) => typeof p === 'string' && (p as string).includes('fallback')
    );
    const metadata = JSON.parse(metadataParam!) as Record<string, unknown>;
    expect(metadata.fallback).toBe(true);
  });

  it("utilise le profil par defaut si le profil IA est absent", async () => {
    mockGetAIContextProfile.mockResolvedValueOnce(null);

    const state = makeState();
    const db = makeMockDb(state);

    const result = await analyzePlateau(db, 'ex-squat', 'user-1', makeSupabaseOk(claudeAnalysis));

    expect(result.exercise).toBe('Squat');
  });

  it('retourne le fallback sans INSERT si aucune session historique (guard FK)', async () => {
    const state = makeState();
    state.sessionRows = [];
    state.setLogRows = [];
    const db = makeMockDb(state);

    const result = await analyzePlateau(db, 'ex-new', 'user-1', makeSupabaseOk(claudeAnalysis));

    expect(result).toBeDefined();
    expect(result.suggestions.length).toBeGreaterThan(0);

    const insertCall = state.insertCalls.find((c) => c.sql.includes('INSERT INTO recommendations'));
    expect(insertCall).toBeUndefined();
  });

  it('inclut les recovery_logs dans le contexte envoye a Claude', async () => {
    const state = makeState();
    const db = makeMockDb(state);
    const supabaseMock = makeSupabaseOk(claudeAnalysis);

    await analyzePlateau(db, 'ex-squat', 'user-1', supabaseMock);

    const invokeCall = (supabaseMock.functions.invoke as jest.Mock).mock.calls[0];
    const body = invokeCall[1].body as { messages: Array<{ content: string }> };
    const messageContent = body.messages[0].content;

    expect(messageContent).toContain('recoveryLogs');
    expect(messageContent).toContain('sleep_quality');
  });

  it('parsePlateauAnalysis avec JSON tronque → retourne le fallback (non-crash)', async () => {
    const state = makeState();
    const db = makeMockDb(state);

    const supabaseTruncated = {
      functions: {
        invoke: jest.fn().mockResolvedValue({
          data: {
            content: [{ type: 'text', text: '{"exercise":"Squat","plateau_duration_weeks":2' }],
          },
          error: null,
        }),
      },
    } as unknown as SupabaseClient;

    const result = await analyzePlateau(db, 'ex-squat', 'user-1', supabaseTruncated);

    expect(result.suggestions).toContain("Vérifier la technique d'exécution");
    expect(result.probable_causes).toBeDefined();
  });
});
