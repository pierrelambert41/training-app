import type { SQLiteDatabase } from 'expo-sqlite';
import { getAIContextProfile, refreshAIContextProfile } from './ai-context-service';
import type { AIContextProfile } from '../types/ai-context';

jest.mock('@/utils/uuid', () => ({
  generateUUID: jest.fn(() => 'test-profile-uuid'),
}));

jest.mock('@/features/sync/api/safe-enqueue', () => ({
  safeEnqueue: jest.fn(async () => {}),
}));

const { safeEnqueue } = jest.requireMock('@/features/sync/api/safe-enqueue') as {
  safeEnqueue: jest.Mock;
};

function makeProfile(version: number): AIContextProfile {
  return {
    version,
    user: {
      level: 'intermediate',
      goals: { primary: 'hypertrophy' },
      training_frequency: 4,
      preferred_unit: 'kg',
    },
    morphology: {
      strong_points: [],
      weak_points: [],
      injury_history: [],
    },
    exercise_preferences: {
      preferred: [],
      avoided: [],
      constraints: [],
    },
    performance_baselines: {},
    recent_highlights: [],
    coaching_style: 'direct',
    parallel_sports: [],
  };
}

type DbState = {
  contextProfileRow: { id: string; version: number } | null;
  runCalls: Array<{ sql: string; params: unknown[] }>;
};

function makeMockDb(state: DbState): SQLiteDatabase {
  return {
    getFirstAsync: jest.fn(async (sql: string, params: unknown[]) => {
      const tableSql = sql as string;

      if (tableSql.includes('ai_context_profiles') && tableSql.includes('id, version')) {
        return state.contextProfileRow;
      }

      if (tableSql.includes('ai_context_profiles') && tableSql.includes('SELECT *')) {
        if (!state.contextProfileRow) return null;
        return {
          id: state.contextProfileRow.id,
          user_id: (params as string[])[0],
          profile_json: JSON.stringify(makeProfile(state.contextProfileRow.version)),
          version: state.contextProfileRow.version,
          updated_at: '2026-05-18T00:00:00.000Z',
        };
      }

      if (tableSql.includes('user_profiles')) {
        return {
          training_level: 'intermediate',
          goals: '{"primary":"hypertrophy"}',
          height_cm: 180,
          preferred_unit: 'kg',
          sports_parallel: '[]',
          constraints: '[]',
        };
      }

      if (tableSql.includes('blocks')) {
        return null;
      }

      if (tableSql.includes('COUNT(*)')) {
        return { total: 0, completed: 0 };
      }

      return null;
    }),

    getAllAsync: jest.fn(async (sql: string) => {
      if ((sql as string).includes('exercise_baselines')) return [];
      if ((sql as string).includes('set_logs')) return [];
      if ((sql as string).includes('recovery_logs')) return [];
      return [];
    }),

    runAsync: jest.fn(async (_sql: string, params: unknown[]) => {
      state.runCalls.push({ sql: _sql as string, params });
      if ((params as unknown[])[0] === 'test-profile-uuid') {
        state.contextProfileRow = { id: 'test-profile-uuid', version: params[3] as number };
      }
      return { lastInsertRowId: 1, changes: 1 };
    }),

    execAsync: jest.fn(async () => {}),
  } as unknown as SQLiteDatabase;
}

describe('getAIContextProfile', () => {
  it('returns null when no profile exists', async () => {
    const state: DbState = { contextProfileRow: null, runCalls: [] };
    const db = makeMockDb(state);
    (db.getFirstAsync as jest.Mock).mockResolvedValue(null);

    const result = await getAIContextProfile(db, 'user-1');
    expect(result).toBeNull();
  });

  it('returns parsed profile when row exists', async () => {
    const state: DbState = {
      contextProfileRow: { id: 'profile-1', version: 3 },
      runCalls: [],
    };
    const db = makeMockDb(state);
    (db.getFirstAsync as jest.Mock).mockResolvedValue({
      id: 'profile-1',
      user_id: 'user-1',
      profile_json: JSON.stringify(makeProfile(3)),
      version: 3,
      updated_at: '2026-05-18T00:00:00.000Z',
    });

    const result = await getAIContextProfile(db, 'user-1');
    expect(result).not.toBeNull();
    expect(result?.version).toBe(3);
  });
});

describe('refreshAIContextProfile', () => {
  beforeEach(() => {
    safeEnqueue.mockClear();
  });

  it('creates a new profile row with version 1 when none exists', async () => {
    const state: DbState = { contextProfileRow: null, runCalls: [] };
    const db = makeMockDb(state);

    const profile = await refreshAIContextProfile(db, 'user-1');

    expect(profile.version).toBe(1);
    expect(state.runCalls.length).toBeGreaterThan(0);
    const insertCall = state.runCalls.find((c) =>
      c.sql.includes('INSERT OR REPLACE INTO ai_context_profiles')
    );
    expect(insertCall).toBeDefined();
  });

  it('increments version when called twice (idempotent — 1 row)', async () => {
    const state: DbState = { contextProfileRow: null, runCalls: [] };
    const db = makeMockDb(state);

    const profile1 = await refreshAIContextProfile(db, 'user-1');
    expect(profile1.version).toBe(1);

    const profile2 = await refreshAIContextProfile(db, 'user-1');
    expect(profile2.version).toBe(2);

    const insertCalls = state.runCalls.filter((c) =>
      c.sql.includes('INSERT OR REPLACE INTO ai_context_profiles')
    );
    expect(insertCalls.length).toBe(2);

    const ids = insertCalls.map((c) => c.params[0]);
    expect(ids[0]).toBe(ids[1]);
  });

  it('calls safeEnqueue with insert action on first refresh', async () => {
    const state: DbState = { contextProfileRow: null, runCalls: [] };
    const db = makeMockDb(state);

    await refreshAIContextProfile(db, 'user-1');

    expect(safeEnqueue).toHaveBeenCalledWith(
      db,
      'ai_context_profiles',
      expect.any(String),
      'insert',
      expect.objectContaining({
        id: expect.any(String),
        user_id: 'user-1',
        version: 1,
      })
    );
  });

  it('calls safeEnqueue with update action on subsequent refresh', async () => {
    const state: DbState = { contextProfileRow: null, runCalls: [] };
    const db = makeMockDb(state);

    await refreshAIContextProfile(db, 'user-1');
    safeEnqueue.mockClear();

    await refreshAIContextProfile(db, 'user-1');

    expect(safeEnqueue).toHaveBeenCalledWith(
      db,
      'ai_context_profiles',
      expect.any(String),
      'update',
      expect.objectContaining({ version: 2 })
    );
  });

  it('returns a profile with required fields', async () => {
    const state: DbState = { contextProfileRow: null, runCalls: [] };
    const db = makeMockDb(state);

    const profile = await refreshAIContextProfile(db, 'user-1');

    expect(profile.user).toBeDefined();
    expect(profile.morphology).toBeDefined();
    expect(profile.exercise_preferences).toBeDefined();
    expect(profile.performance_baselines).toBeDefined();
    expect(Array.isArray(profile.recent_highlights)).toBe(true);
    expect(profile.coaching_style).toBeDefined();
    expect(Array.isArray(profile.parallel_sports)).toBe(true);
  });
});
