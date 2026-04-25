import {
  deleteSetLog,
  getSetLogById,
  getSetLogsBySessionAndExercise,
  getSetLogsBySessionId,
  insertSetLog,
  updateSetLog,
} from './set-logs';
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

describe('set-logs repository', () => {
  describe('insertSetLog', () => {
    it('inserts with completed=true by default and persists boolean as 1', async () => {
      const db = makeMockDb();
      const setLog = await insertSetLog(db, {
        id: 'sl1',
        sessionId: 's1',
        exerciseId: 'ex1',
        plannedExerciseId: 'pe1',
        setNumber: 1,
        load: 100,
        reps: 8,
        rir: 2,
      });

      expect(setLog.completed).toBe(true);
      expect(setLog.plannedExerciseId).toBe('pe1');
      expect(setLog.side).toBeNull();

      const insertCall = db.runAsync.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('INSERT INTO set_logs')
      );
      const params = insertCall![1] as unknown[];
      // completed est sérialisé en 1 (entier) côté SQLite.
      expect(params[13]).toBe(1);
    });

    it('payload Supabase utilise le boolean natif (pas 0/1)', async () => {
      const db = makeMockDb();
      await insertSetLog(db, {
        id: 'sl1',
        sessionId: 's1',
        exerciseId: 'ex1',
        setNumber: 1,
        completed: false,
      });

      const syncCall = db.runAsync.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('INSERT INTO sync_queue')
      );
      const payload = JSON.parse((syncCall![1] as unknown[])[3] as string);
      expect(payload.completed).toBe(false);
      expect(payload.completed).not.toBe(0);
    });

    it('plannedExerciseId is null when not provided (freestyle set)', async () => {
      const db = makeMockDb();
      const setLog = await insertSetLog(db, {
        id: 'sl1',
        sessionId: 's1',
        exerciseId: 'ex1',
        setNumber: 1,
      });
      expect(setLog.plannedExerciseId).toBeNull();
      const syncCall = db.runAsync.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('INSERT INTO sync_queue')
      );
      const payload = JSON.parse((syncCall![1] as unknown[])[3] as string);
      expect(payload.planned_exercise_id).toBeNull();
    });

    it('side accepts left/right/null', async () => {
      const db = makeMockDb();
      const left = await insertSetLog(db, {
        id: 'sl-l',
        sessionId: 's1',
        exerciseId: 'ex1',
        setNumber: 1,
        side: 'left',
      });
      const right = await insertSetLog(db, {
        id: 'sl-r',
        sessionId: 's1',
        exerciseId: 'ex1',
        setNumber: 1,
        side: 'right',
      });
      expect(left.side).toBe('left');
      expect(right.side).toBe('right');
    });

    it('rejects set_number < 1', async () => {
      const db = makeMockDb();
      await expect(
        insertSetLog(db, {
          id: 'sl1',
          sessionId: 's1',
          exerciseId: 'ex1',
          setNumber: 0,
        })
      ).rejects.toThrow(/Invalid set_number/);
    });

    it('rejects non-integer set_number', async () => {
      const db = makeMockDb();
      await expect(
        insertSetLog(db, {
          id: 'sl1',
          sessionId: 's1',
          exerciseId: 'ex1',
          setNumber: 1.5,
        })
      ).rejects.toThrow(/Invalid set_number/);
    });

    it('persists duration_seconds and distance_meters when provided', async () => {
      const db = makeMockDb();
      const setLog = await insertSetLog(db, {
        id: 'sl1',
        sessionId: 's1',
        exerciseId: 'ex1',
        setNumber: 1,
        durationSeconds: 60,
        distanceMeters: 200,
      });
      expect(setLog.durationSeconds).toBe(60);
      expect(setLog.distanceMeters).toBe(200);
    });
  });

  describe('updateSetLog', () => {
    const existingRow = {
      id: 'sl1',
      session_id: 's1',
      exercise_id: 'ex1',
      planned_exercise_id: 'pe1',
      set_number: 1,
      target_load: 100,
      target_reps: 8,
      target_rir: 2,
      load: 100,
      reps: 8,
      rir: 2,
      duration_seconds: null,
      distance_meters: null,
      completed: 1,
      side: null,
      notes: null,
      created_at: '2026-04-25T10:00:00.000Z',
      updated_at: '2026-04-25T10:00:00.000Z',
    };

    it('returns null when set log missing', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(null);
      expect(
        await updateSetLog(db, 'missing', { reps: 10 })
      ).toBeNull();
    });

    it('corrects reps post-séance and bumps updated_at', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(existingRow);

      const updated = await updateSetLog(db, 'sl1', { reps: 10 });
      expect(updated?.reps).toBe(10);
      expect(updated?.updatedAt).not.toBe(existingRow.updated_at);

      const syncCall = db.runAsync.mock.calls.find(
        ([sql]) =>
          typeof sql === 'string' && sql.includes('INSERT INTO sync_queue')
      );
      expect(syncCall).toBeDefined();
      const params = syncCall![1] as unknown[];
      expect(params[2]).toBe('update');
      const payload = JSON.parse(params[3] as string);
      // Idempotence : payload complet à chaque update (ADR-012).
      expect(payload).toMatchObject({
        id: 'sl1',
        session_id: 's1',
        reps: 10,
        completed: true,
      });
    });

    it('null is a valid update (clearing rir for example)', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(existingRow);
      const updated = await updateSetLog(db, 'sl1', { rir: null });
      expect(updated?.rir).toBeNull();
    });

    it('rejects invalid set_number on update', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(existingRow);
      await expect(
        updateSetLog(db, 'sl1', { setNumber: 0 })
      ).rejects.toThrow(/Invalid set_number/);
    });
  });

  describe('deleteSetLog', () => {
    it('enqueues a delete record with minimal payload', async () => {
      const db = makeMockDb();
      await deleteSetLog(db, 'sl1');
      const calls = db.runAsync.mock.calls;
      expect((calls[0] as [string, unknown[]])[0]).toContain(
        'DELETE FROM set_logs'
      );
      const params = calls[1][1] as unknown[];
      expect(params[0]).toBe('set_logs');
      expect(params[2]).toBe('delete');
      expect(JSON.parse(params[3] as string)).toEqual({ id: 'sl1' });
    });
  });

  describe('getSetLogById', () => {
    it('maps row correctly including completed=0 → false', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'sl1',
        session_id: 's1',
        exercise_id: 'ex1',
        planned_exercise_id: null,
        set_number: 2,
        target_load: null,
        target_reps: null,
        target_rir: null,
        load: 80,
        reps: 6,
        rir: 1,
        duration_seconds: null,
        distance_meters: null,
        completed: 0,
        side: 'left',
        notes: 'forme dégradée',
        created_at: '2026-04-25T10:05:00.000Z',
        updated_at: '2026-04-25T10:05:00.000Z',
      });

      const setLog = await getSetLogById(db, 'sl1');
      expect(setLog?.completed).toBe(false);
      expect(setLog?.side).toBe('left');
      expect(setLog?.plannedExerciseId).toBeNull();
    });
  });

  describe('getSetLogsBySessionId', () => {
    it('filters by session_id and orders by exercise/set_number', async () => {
      const db = makeMockDb();
      await getSetLogsBySessionId(db, 's1');
      const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('session_id = ?');
      expect(sql).toContain('ORDER BY exercise_id ASC, set_number ASC');
      expect(params).toEqual(['s1']);
    });
  });

  describe('getSetLogsBySessionAndExercise', () => {
    it('filters by both session and exercise, ordered by set_number', async () => {
      const db = makeMockDb();
      await getSetLogsBySessionAndExercise(db, 's1', 'ex1');
      const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('session_id = ? AND exercise_id = ?');
      expect(sql).toContain('ORDER BY set_number ASC');
      expect(params).toEqual(['s1', 'ex1']);
    });
  });
});
