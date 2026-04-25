import {
  deleteSession,
  getSessionById,
  getSessionCountsByBlockId,
  getSessionsByUserId,
  insertSession,
  updateSession,
} from './sessions';
import type { SQLiteDatabase } from 'expo-sqlite';

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

describe('sessions repository', () => {
  describe('insertSession', () => {
    it('inserts with defaults : status=in_progress, scores null, deviceId resolved', async () => {
      const db = makeMockDb();
      // 1er getFirstAsync = lecture device_id (null) ; runAsync = INSERT app_meta
      // puis re-read device_id ; puis le INSERT session ; puis enqueue.
      let deviceIdValue: string | null = null;
      db.getFirstAsync.mockImplementation(async (sql: string) => {
        if (sql.includes('FROM app_meta')) {
          return deviceIdValue ? { value: deviceIdValue } : null;
        }
        return null;
      });
      db.runAsync.mockImplementation(
        async (sql: string, params: unknown[]) => {
          if (sql.includes('INSERT OR IGNORE INTO app_meta')) {
            deviceIdValue = params[1] as string;
          }
          return { lastInsertRowId: 1, changes: 1 };
        }
      );

      const session = await insertSession(db, {
        id: 's1',
        userId: 'u1',
        workoutDayId: 'wd1',
        blockId: 'b1',
        date: '2026-04-25',
      });

      expect(session.status).toBe('in_progress');
      expect(session.completionScore).toBeNull();
      expect(session.performanceScore).toBeNull();
      expect(session.fatigueScore).toBeNull();
      expect(session.syncedAt).toBeNull();
      expect(session.deviceId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );

      // INSERT session + INSERT sync_queue (en plus des appels device_id).
      const sessionInsert = db.runAsync.mock.calls.find(
        ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO sessions')
      );
      expect(sessionInsert).toBeDefined();
      const syncInsert = db.runAsync.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('INSERT INTO sync_queue')
      );
      expect(syncInsert).toBeDefined();
      const syncParams = syncInsert![1] as unknown[];
      expect(syncParams[0]).toBe('sessions');
      expect(syncParams[1]).toBe('s1');
      expect(syncParams[2]).toBe('insert');
      const payload = JSON.parse(syncParams[3] as string);
      expect(payload).toMatchObject({
        id: 's1',
        user_id: 'u1',
        workout_day_id: 'wd1',
        block_id: 'b1',
        date: '2026-04-25',
        status: 'in_progress',
        completion_score: null,
        performance_score: null,
        fatigue_score: null,
      });
      expect(payload.device_id).toBe(session.deviceId);
      // synced_at ne doit JAMAIS être inclus dans le payload — c'est la
      // responsabilité du sync engine (Phase 6).
      expect(payload).not.toHaveProperty('synced_at');
    });

    it('uses provided deviceId without DB lookup', async () => {
      const db = makeMockDb();
      const session = await insertSession(db, {
        id: 's2',
        userId: 'u1',
        date: '2026-04-25',
        deviceId: 'forced-device-id',
      });
      expect(session.deviceId).toBe('forced-device-id');
      // Aucun SELECT app_meta puisque deviceId fourni
      const selectCalls = db.getFirstAsync.mock.calls.filter(
        ([sql]) => typeof sql === 'string' && sql.includes('FROM app_meta')
      );
      expect(selectCalls).toHaveLength(0);
    });

    it('accepts status=abandoned when explicitly passed', async () => {
      const db = makeMockDb();
      const session = await insertSession(db, {
        id: 's3',
        userId: 'u1',
        date: '2026-04-25',
        status: 'abandoned',
        deviceId: 'd1',
      });
      expect(session.status).toBe('abandoned');
    });

    it('readiness fields stay null by default', async () => {
      const db = makeMockDb();
      const session = await insertSession(db, {
        id: 's4',
        userId: 'u1',
        date: '2026-04-25',
        deviceId: 'd1',
      });
      expect(session.readiness).toBeNull();
      expect(session.energy).toBeNull();
      expect(session.motivation).toBeNull();
      expect(session.sleepQuality).toBeNull();
    });
  });

  describe('updateSession', () => {
    const existingRow = {
      id: 's1',
      user_id: 'u1',
      workout_day_id: 'wd1',
      block_id: 'b1',
      date: '2026-04-25',
      started_at: '2026-04-25T10:00:00.000Z',
      ended_at: null,
      status: 'in_progress',
      readiness: null,
      energy: null,
      motivation: null,
      sleep_quality: null,
      pre_session_notes: null,
      completion_score: null,
      performance_score: null,
      fatigue_score: null,
      post_session_notes: null,
      device_id: 'd1',
      synced_at: null,
      created_at: '2026-04-25T10:00:00.000Z',
      updated_at: '2026-04-25T10:00:00.000Z',
    };

    it('returns null if session missing', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(null);
      expect(
        await updateSession(db, 'missing', { status: 'completed' })
      ).toBeNull();
    });

    it('transitions status in_progress → completed and bumps updated_at', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(existingRow);

      const updated = await updateSession(db, 's1', {
        status: 'completed',
        endedAt: '2026-04-25T11:30:00.000Z',
        completionScore: 92.5,
      });

      expect(updated?.status).toBe('completed');
      expect(updated?.endedAt).toBe('2026-04-25T11:30:00.000Z');
      expect(updated?.completionScore).toBe(92.5);
      expect(updated?.updatedAt).not.toBe(existingRow.updated_at);

      const syncCall = db.runAsync.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('INSERT INTO sync_queue')
      );
      expect(syncCall).toBeDefined();
      const syncParams = syncCall![1] as unknown[];
      expect(syncParams[2]).toBe('update');
      const payload = JSON.parse(syncParams[3] as string);
      expect(payload.status).toBe('completed');
      expect(payload.completion_score).toBe(92.5);
    });

    it('null is a valid update target (ex: clearing endedAt)', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        ...existingRow,
        ended_at: '2026-04-25T11:00:00.000Z',
      });

      const updated = await updateSession(db, 's1', { endedAt: null });
      expect(updated?.endedAt).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('deletes child set_logs first, then session, with one enqueue per delete', async () => {
      const db = makeMockDb();
      db.getAllAsync.mockResolvedValueOnce([{ id: 'sl1' }, { id: 'sl2' }]);

      await deleteSession(db, 's1');

      const deleteSqls = db.runAsync.mock.calls
        .map(([sql]) => sql as string)
        .filter((sql) => sql.includes('DELETE FROM'));
      // 2 deletes set_logs + 1 delete session.
      const setLogDeletes = deleteSqls.filter((s) =>
        s.includes('DELETE FROM set_logs')
      );
      const sessionDeletes = deleteSqls.filter((s) =>
        s.includes('DELETE FROM sessions')
      );
      expect(setLogDeletes).toHaveLength(2);
      expect(sessionDeletes).toHaveLength(1);

      // Ordre : set_logs avant sessions.
      const firstDelete = deleteSqls[0];
      expect(firstDelete).toContain('DELETE FROM set_logs');
      const lastDelete = deleteSqls[deleteSqls.length - 1];
      expect(lastDelete).toContain('DELETE FROM sessions');

      const enqueueCalls = db.runAsync.mock.calls.filter(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('INSERT INTO sync_queue')
      );
      expect(enqueueCalls).toHaveLength(3); // 2 set_logs + 1 session

      const tables = enqueueCalls.map((c) => (c[1] as unknown[])[0]);
      expect(tables).toEqual(['set_logs', 'set_logs', 'sessions']);
      const actions = enqueueCalls.map((c) => (c[1] as unknown[])[2]);
      expect(actions.every((a) => a === 'delete')).toBe(true);
    });

    it('handles a session with no set_logs', async () => {
      const db = makeMockDb();
      db.getAllAsync.mockResolvedValueOnce([]);

      await deleteSession(db, 's1');

      const sessionDeletes = db.runAsync.mock.calls.filter(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('DELETE FROM sessions')
      );
      expect(sessionDeletes).toHaveLength(1);
    });
  });

  describe('getSessionById', () => {
    it('maps row including all readiness / score fields', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 's1',
        user_id: 'u1',
        workout_day_id: 'wd1',
        block_id: 'b1',
        date: '2026-04-25',
        started_at: '2026-04-25T10:00:00.000Z',
        ended_at: '2026-04-25T11:00:00.000Z',
        status: 'completed',
        readiness: 8,
        energy: 7,
        motivation: 9,
        sleep_quality: 6,
        pre_session_notes: 'good warmup',
        completion_score: 95,
        performance_score: 88,
        fatigue_score: 42,
        post_session_notes: 'great session',
        device_id: 'd1',
        synced_at: null,
        created_at: '2026-04-25T10:00:00.000Z',
        updated_at: '2026-04-25T11:00:00.000Z',
      });

      const session = await getSessionById(db, 's1');
      expect(session).toEqual({
        id: 's1',
        userId: 'u1',
        workoutDayId: 'wd1',
        blockId: 'b1',
        date: '2026-04-25',
        startedAt: '2026-04-25T10:00:00.000Z',
        endedAt: '2026-04-25T11:00:00.000Z',
        status: 'completed',
        readiness: 8,
        energy: 7,
        motivation: 9,
        sleepQuality: 6,
        preSessionNotes: 'good warmup',
        completionScore: 95,
        performanceScore: 88,
        fatigueScore: 42,
        postSessionNotes: 'great session',
        deviceId: 'd1',
        syncedAt: null,
        createdAt: '2026-04-25T10:00:00.000Z',
        updatedAt: '2026-04-25T11:00:00.000Z',
      });
    });
  });

  describe('getSessionsByUserId', () => {
    it('orders by date DESC and respects limit', async () => {
      const db = makeMockDb();
      await getSessionsByUserId(db, 'u1', 10);
      const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('user_id = ?');
      expect(sql).toContain('ORDER BY date DESC');
      expect(sql).toContain('LIMIT ?');
      expect(params).toEqual(['u1', 10]);
    });

    it('omits LIMIT when not provided', async () => {
      const db = makeMockDb();
      await getSessionsByUserId(db, 'u1');
      const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).not.toContain('LIMIT');
      expect(params).toEqual(['u1']);
    });
  });

  describe('getSessionCountsByBlockId', () => {
    it('only counts completed sessions and groups by workout_day_id', async () => {
      const db = makeMockDb();
      db.getAllAsync.mockResolvedValueOnce([
        { workout_day_id: 'wd1', count: 3 },
        { workout_day_id: 'wd2', count: 1 },
      ]);

      const counts = await getSessionCountsByBlockId(db, 'b1');
      expect(counts).toEqual({ wd1: 3, wd2: 1 });
      const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain("status = 'completed'");
      expect(sql).toContain('GROUP BY workout_day_id');
      expect(params).toEqual(['b1']);
    });
  });
});
