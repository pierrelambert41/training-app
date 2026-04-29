import {
  clearRecommendationsForSession,
  deleteRecommendation,
  getRecommendationById,
  getRecommendationsBySession,
  saveRecommendation,
  updateRecommendation,
} from './recommendations';
import type { SQLiteDatabase } from 'expo-sqlite';

// Recommendation rows as stored in SQLite (metadata as JSON string).
type DbRow = {
  id: string;
  session_id: string;
  exercise_id: string | null;
  source: string;
  type: string;
  message: string;
  next_load: number | null;
  next_rep_target: number | null;
  next_rir_target: number | null;
  action: string | null;
  confidence: number | null;
  metadata: string;
  created_at: string;
};

type MockDb = SQLiteDatabase & {
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
};

function makeMockDb(overrides?: Partial<SQLiteDatabase>): MockDb {
  return {
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    execAsync: jest.fn(async () => {}),
    ...overrides,
  } as unknown as MockDb;
}

function makeDbRow(overrides?: Partial<DbRow>): DbRow {
  return {
    id: 'rec1',
    session_id: 's1',
    exercise_id: 'ex1',
    source: 'rules_engine',
    type: 'load_change',
    message: 'Increase load by 2.5kg',
    next_load: 82.5,
    next_rep_target: 8,
    next_rir_target: 2,
    action: 'increase',
    confidence: 0.9,
    metadata: '{"previous_load":80}',
    created_at: '2026-04-29T10:00:00.000Z',
    ...overrides,
  };
}

describe('recommendations repository', () => {
  describe('saveRecommendation', () => {
    it('inserts a recommendation and enqueues a sync record', async () => {
      const db = makeMockDb();

      const rec = await saveRecommendation(db, {
        id: 'rec1',
        sessionId: 's1',
        exerciseId: 'ex1',
        source: 'rules_engine',
        type: 'load_change',
        message: 'Increase load by 2.5kg',
        nextLoad: 82.5,
        nextRepTarget: 8,
        nextRirTarget: 2,
        action: 'increase',
        confidence: 0.9,
        metadata: { previous_load: 80 },
      });

      expect(rec.id).toBe('rec1');
      expect(rec.sessionId).toBe('s1');
      expect(rec.exerciseId).toBe('ex1');
      expect(rec.source).toBe('rules_engine');
      expect(rec.type).toBe('load_change');
      expect(rec.message).toBe('Increase load by 2.5kg');
      expect(rec.nextLoad).toBe(82.5);
      expect(rec.nextRepTarget).toBe(8);
      expect(rec.nextRirTarget).toBe(2);
      expect(rec.action).toBe('increase');
      expect(rec.confidence).toBe(0.9);
      expect(rec.metadata).toEqual({ previous_load: 80 });
      expect(rec.createdAt).toBeTruthy();

      const insertCall = db.runAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('INSERT INTO recommendations')
      );
      expect(insertCall).toBeDefined();

      const syncCall = db.runAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('INSERT INTO sync_queue')
      );
      expect(syncCall).toBeDefined();
      const syncParams = syncCall![1] as unknown[];
      expect(syncParams[0]).toBe('recommendations');
      expect(syncParams[1]).toBe('rec1');
      expect(syncParams[2]).toBe('insert');
    });

    it('applies defaults for optional fields', async () => {
      const db = makeMockDb();

      const rec = await saveRecommendation(db, {
        id: 'rec2',
        sessionId: 's1',
        source: 'ai',
        type: 'summary',
        message: 'Good session overall.',
      });

      expect(rec.exerciseId).toBeNull();
      expect(rec.nextLoad).toBeNull();
      expect(rec.nextRepTarget).toBeNull();
      expect(rec.nextRirTarget).toBeNull();
      expect(rec.action).toBeNull();
      expect(rec.confidence).toBeNull();
      expect(rec.metadata).toEqual({});
    });

    it('accepts a session-level recommendation without exerciseId', async () => {
      const db = makeMockDb();

      const rec = await saveRecommendation(db, {
        id: 'rec3',
        sessionId: 's1',
        exerciseId: null,
        source: 'rules_engine',
        type: 'deload',
        message: 'Deload week recommended.',
        action: 'deload',
        confidence: 0.95,
      });

      expect(rec.exerciseId).toBeNull();
      expect(rec.type).toBe('deload');
      expect(rec.action).toBe('deload');
    });
  });

  describe('getRecommendationById', () => {
    it('returns null when not found', async () => {
      const db = makeMockDb();
      const result = await getRecommendationById(db, 'unknown');
      expect(result).toBeNull();
    });

    it('maps db row to Recommendation domain object', async () => {
      const row = makeDbRow();
      const db = makeMockDb({
        getFirstAsync: jest.fn(async () => row),
      });

      const rec = await getRecommendationById(db, 'rec1');
      expect(rec).not.toBeNull();
      expect(rec!.id).toBe('rec1');
      expect(rec!.metadata).toEqual({ previous_load: 80 });
      expect(rec!.source).toBe('rules_engine');
      expect(rec!.type).toBe('load_change');
    });

    it('handles null exercise_id (session-level recommendation)', async () => {
      const row = makeDbRow({ exercise_id: null });
      const db = makeMockDb({
        getFirstAsync: jest.fn(async () => row),
      });

      const rec = await getRecommendationById(db, 'rec1');
      expect(rec!.exerciseId).toBeNull();
    });
  });

  describe('getRecommendationsBySession', () => {
    it('returns empty array when no recommendations', async () => {
      const db = makeMockDb();
      const results = await getRecommendationsBySession(db, 's1');
      expect(results).toEqual([]);
    });

    it('maps multiple rows to Recommendation objects', async () => {
      const rows = [
        makeDbRow({ id: 'rec1', type: 'load_change' }),
        makeDbRow({
          id: 'rec2',
          type: 'summary',
          exercise_id: null,
          metadata: '{}',
        }),
      ];
      const db = makeMockDb({
        getAllAsync: jest.fn(async () => rows),
      });

      const results = await getRecommendationsBySession(db, 's1');
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('rec1');
      expect(results[1].id).toBe('rec2');
      expect(results[1].exerciseId).toBeNull();

      const query = db.getAllAsync.mock.calls[0][0] as string;
      expect(query).toContain('WHERE session_id = ?');
      expect(query).toContain('ORDER BY created_at ASC');
    });
  });

  describe('updateRecommendation', () => {
    it('returns null when recommendation not found', async () => {
      const db = makeMockDb();
      const result = await updateRecommendation(db, 'nonexistent', {
        message: 'Updated',
      });
      expect(result).toBeNull();
    });

    it('updates only provided fields and enqueues update', async () => {
      const row = makeDbRow();
      const db = makeMockDb({
        getFirstAsync: jest.fn(async () => row),
      });

      const result = await updateRecommendation(db, 'rec1', {
        nextLoad: 85,
        confidence: 0.95,
      });

      expect(result).not.toBeNull();
      expect(result!.nextLoad).toBe(85);
      expect(result!.confidence).toBe(0.95);
      // Unchanged fields preserved.
      expect(result!.message).toBe('Increase load by 2.5kg');
      expect(result!.action).toBe('increase');

      const updateCall = db.runAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('UPDATE recommendations')
      );
      expect(updateCall).toBeDefined();

      const syncCall = db.runAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('INSERT INTO sync_queue')
      );
      expect(syncCall).toBeDefined();
      const syncParams = syncCall![1] as unknown[];
      expect(syncParams[2]).toBe('update');
    });

    it('updates metadata and serializes to JSON', async () => {
      const row = makeDbRow();
      const db = makeMockDb({
        getFirstAsync: jest.fn(async () => row),
      });

      const result = await updateRecommendation(db, 'rec1', {
        metadata: { previous_load: 80, notes: 'plateau detected' },
      });

      expect(result!.metadata).toEqual({
        previous_load: 80,
        notes: 'plateau detected',
      });

      const updateCall = db.runAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('UPDATE recommendations')
      );
      const params = updateCall![1] as unknown[];
      const metadataParam = params.find(
        (p) => typeof p === 'string' && p.includes('plateau detected')
      );
      expect(metadataParam).toBeDefined();
    });
  });

  describe('deleteRecommendation', () => {
    it('deletes by id and enqueues delete sync record', async () => {
      const db = makeMockDb();
      await deleteRecommendation(db, 'rec1');

      const deleteCall = db.runAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('DELETE FROM recommendations')
      );
      expect(deleteCall).toBeDefined();

      const syncCall = db.runAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('INSERT INTO sync_queue')
      );
      expect(syncCall).toBeDefined();
      const syncParams = syncCall![1] as unknown[];
      expect(syncParams[2]).toBe('delete');
    });
  });

  describe('clearRecommendationsForSession', () => {
    it('does nothing when session has no recommendations', async () => {
      const db = makeMockDb();
      await clearRecommendationsForSession(db, 's1');
      const deleteCall = db.runAsync.mock.calls.find(
        ([sql]: [string]) => sql.includes('DELETE FROM recommendations')
      );
      expect(deleteCall).toBeUndefined();
    });

    it('deletes all recommendations and enqueues delete for each', async () => {
      const rows = [makeDbRow({ id: 'rec1' }), makeDbRow({ id: 'rec2' })];
      const db = makeMockDb({
        getAllAsync: jest.fn(async () => rows),
      });

      await clearRecommendationsForSession(db, 's1');

      const deleteCalls = db.runAsync.mock.calls.filter(
        ([sql]: [string]) => sql.includes('DELETE FROM recommendations')
      );
      expect(deleteCalls).toHaveLength(2);

      const syncCalls = db.runAsync.mock.calls.filter(
        ([sql]: [string]) =>
          sql.includes('INSERT INTO sync_queue') &&
          (db.runAsync.mock.calls.indexOf([sql]) > -1 || true)
      );
      const deleteEnqueues = db.runAsync.mock.calls.filter(
        ([sql, params]: [string, unknown[]]) =>
          sql.includes('INSERT INTO sync_queue') &&
          Array.isArray(params) &&
          params[2] === 'delete'
      );
      expect(deleteEnqueues).toHaveLength(2);
    });
  });
});
