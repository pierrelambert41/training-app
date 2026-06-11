/**
 * Tests TA-141 — Worker de la queue de retry IA.
 *
 * Vérifie :
 * - entrée session_summary traitée avec succès → status 'done'
 * - entrée block_summary traitée avec succès → status 'done'
 * - échec → attempts incrémenté, reste 'pending' ; 3e échec → 'failed' définitif
 * - SELECT filtre status='pending' (une entrée done n'est jamais re-traitée)
 * - batch limité à 5 entrées par cycle
 * - traitement séquentiel (pas de parallélisme)
 * - type à la demande (plateau / explain_adjustment) → 'failed' direct
 * - payload JSON invalide → 'failed' direct (pas de crash)
 * - userId du payload prioritaire sur le userId du cycle
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { processPendingAICalls } from './ai-queue-service';

const mockRetrySessionSummary = jest.fn();
jest.mock('./session-summary-service', () => ({
  retrySessionSummary: (...args: unknown[]) => mockRetrySessionSummary(...args),
}));

const mockRetryBlockSummary = jest.fn();
jest.mock('./block-summary-service', () => ({
  retryBlockSummary: (...args: unknown[]) => mockRetryBlockSummary(...args),
}));

type Row = Record<string, unknown>;

type MockDbState = {
  pendingRows: Row[];
  updates: Array<{ sql: string; params: unknown[] }>;
  selectCalls: Array<{ sql: string; params: unknown[] }>;
};

function makeDb(state: MockDbState): SQLiteDatabase {
  return {
    getAllAsync: jest.fn(async (sql: string, params: unknown[]) => {
      state.selectCalls.push({ sql, params });
      const limit = (params as number[])[0];
      return state.pendingRows.slice(0, limit);
    }),
    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      state.updates.push({ sql, params });
      return { lastInsertRowId: 0, changes: 1 };
    }),
  } as unknown as SQLiteDatabase;
}

function makeRow(overrides: Row = {}): Row {
  return {
    id: 'q1',
    session_id: 'session-1',
    recommendation_id: 'rec-1',
    type: 'session_summary',
    payload: JSON.stringify({ sessionId: 'session-1', userId: 'user-1' }),
    status: 'pending',
    attempts: 0,
    created_at: '2026-06-01T10:00:00Z',
    ...overrides,
  };
}

const supabase = {} as SupabaseClient;

describe('processPendingAICalls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRetrySessionSummary.mockResolvedValue(true);
    mockRetryBlockSummary.mockResolvedValue(true);
  });

  it("session_summary traité avec succès → status 'done'", async () => {
    const state: MockDbState = { pendingRows: [makeRow()], updates: [], selectCalls: [] };

    const result = await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(result).toEqual({ processed: 1, done: 1, failed: 0 });
    expect(mockRetrySessionSummary).toHaveBeenCalledWith(
      expect.anything(),
      'session-1',
      'user-1',
      supabase
    );
    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].sql).toContain("'done'");
  });

  it("block_summary traité avec succès → status 'done'", async () => {
    const state: MockDbState = {
      pendingRows: [
        makeRow({
          id: 'q2',
          type: 'block_summary',
          payload: JSON.stringify({ blockId: 'block-1', userId: 'user-1' }),
        }),
      ],
      updates: [],
      selectCalls: [],
    };

    const result = await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(result.done).toBe(1);
    expect(mockRetryBlockSummary).toHaveBeenCalledWith(
      expect.anything(),
      'block-1',
      'user-1',
      supabase
    );
  });

  it("échec → attempts incrémenté, reste 'pending'", async () => {
    mockRetrySessionSummary.mockResolvedValue(false);
    const state: MockDbState = { pendingRows: [makeRow()], updates: [], selectCalls: [] };

    const result = await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(result).toEqual({ processed: 1, done: 0, failed: 0 });
    expect(state.updates[0].params).toEqual(['pending', 1, 'q1']);
  });

  it("3e échec → 'failed' définitif", async () => {
    mockRetrySessionSummary.mockResolvedValue(false);
    const state: MockDbState = {
      pendingRows: [makeRow({ attempts: 2 })],
      updates: [],
      selectCalls: [],
    };

    const result = await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(result.failed).toBe(1);
    expect(state.updates[0].params).toEqual(['failed', 3, 'q1']);
  });

  it("exception du handler → traitée comme un échec (attempts + 1)", async () => {
    mockRetrySessionSummary.mockRejectedValue(new Error('boom'));
    const state: MockDbState = { pendingRows: [makeRow()], updates: [], selectCalls: [] };

    await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(state.updates[0].params).toEqual(['pending', 1, 'q1']);
  });

  it("le SELECT filtre status='pending' (une entrée done n'est jamais re-traitée)", async () => {
    const state: MockDbState = { pendingRows: [], updates: [], selectCalls: [] };

    await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(state.selectCalls[0].sql).toContain("status = 'pending'");
    expect(state.selectCalls[0].sql).toContain('ORDER BY created_at ASC');
  });

  it('batch limité à 5 entrées par cycle', async () => {
    const rows = Array.from({ length: 8 }, (_, i) => makeRow({ id: `q${i}` }));
    const state: MockDbState = { pendingRows: rows, updates: [], selectCalls: [] };

    const result = await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(state.selectCalls[0].params).toEqual([5]);
    expect(result.processed).toBe(5);
  });

  it('traitement séquentiel : un appel à la fois', async () => {
    let concurrent = 0;
    let maxConcurrent = 0;
    mockRetrySessionSummary.mockImplementation(async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 5));
      concurrent -= 1;
      return true;
    });
    const rows = [makeRow({ id: 'q1' }), makeRow({ id: 'q2' }), makeRow({ id: 'q3' })];
    const state: MockDbState = { pendingRows: rows, updates: [], selectCalls: [] };

    await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(maxConcurrent).toBe(1);
  });

  it("type à la demande (plateau) → 'failed' direct sans retry", async () => {
    const state: MockDbState = {
      pendingRows: [makeRow({ type: 'plateau' })],
      updates: [],
      selectCalls: [],
    };

    const result = await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(result.failed).toBe(1);
    expect(state.updates[0].sql).toContain("'failed'");
    expect(mockRetrySessionSummary).not.toHaveBeenCalled();
  });

  it("payload JSON invalide sans session_id → 'failed' direct, pas de crash", async () => {
    const state: MockDbState = {
      pendingRows: [makeRow({ payload: '{invalid', session_id: null })],
      updates: [],
      selectCalls: [],
    };

    const result = await processPendingAICalls(makeDb(state), 'user-1', supabase);

    expect(result.failed).toBe(1);
    expect(state.updates[0].sql).toContain("'failed'");
  });

  it('userId du payload prioritaire sur le userId du cycle', async () => {
    const state: MockDbState = {
      pendingRows: [
        makeRow({ payload: JSON.stringify({ sessionId: 'session-1', userId: 'user-payload' }) }),
      ],
      updates: [],
      selectCalls: [],
    };

    await processPendingAICalls(makeDb(state), 'user-cycle', supabase);

    expect(mockRetrySessionSummary).toHaveBeenCalledWith(
      expect.anything(),
      'session-1',
      'user-payload',
      supabase
    );
  });
});
