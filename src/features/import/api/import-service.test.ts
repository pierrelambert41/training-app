import type { SQLiteDatabase } from 'expo-sqlite';
import { importHevySessions } from './import-service';
import type { HevyExerciseMapping, HevyParsedData } from '../types/import-result';

type MockDb = SQLiteDatabase & {
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
};

/**
 * Builds a mock SQLite database that:
 * - tracks all `runAsync` calls
 * - returns `deviceId` via `getFirstAsync` for device_id resolution
 * - returns empty sessions (no dedup) by default via `getAllAsync`
 * - accepts `sessionsRows` and `setLogRows` to simulate existing data for dedup
 */
function makeMockDb(overrides?: {
  existingSessions?: Array<{ id: string }>;
  existingSetLogs?: Array<{ exercise_id: string }>;
}): MockDb {
  const existingSessions = overrides?.existingSessions ?? [];
  const existingSetLogs = overrides?.existingSetLogs ?? [];

  return {
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
    getFirstAsync: jest.fn(async (sql: string) => {
      if ((sql as string).includes('FROM app_meta')) {
        return { value: 'device-test-id' };
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql: string) => {
      if ((sql as string).includes('FROM sessions')) {
        return existingSessions;
      }
      if ((sql as string).includes('FROM set_logs')) {
        return existingSetLogs;
      }
      return [];
    }),
    execAsync: jest.fn(async () => {}),
  } as unknown as MockDb;
}

const USER_ID = 'user-001';

const MAPPING_BENCH: HevyExerciseMapping = {
  hevyName: 'Bench Press',
  internalId: 'ex-bench',
  ignored: false,
};

const MAPPING_SQUAT: HevyExerciseMapping = {
  hevyName: 'Squat',
  internalId: 'ex-squat',
  ignored: false,
};

const MAPPING_IGNORED: HevyExerciseMapping = {
  hevyName: 'Unknown Exercise',
  internalId: null,
  ignored: true,
};

function makeParsedData(sessions: HevyParsedData['sessions']): HevyParsedData {
  return { sessions };
}

describe('importHevySessions', () => {
  describe('golden path — 3 sessions', () => {
    it('imports all sessions and returns correct counts', async () => {
      const db = makeMockDb();

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Bench Press',
          sets: [
            { setOrder: 1, weightKg: 80, reps: 8 },
            { setOrder: 2, weightKg: 80, reps: 7 },
          ],
        },
        {
          date: '2026-01-12',
          exerciseName: 'Squat',
          sets: [
            { setOrder: 1, weightKg: 100, reps: 5 },
            { setOrder: 2, weightKg: 100, reps: 5 },
            { setOrder: 3, weightKg: 100, reps: 4 },
          ],
        },
        {
          date: '2026-01-14',
          exerciseName: 'Bench Press',
          sets: [{ setOrder: 1, weightKg: 82.5, reps: 8 }],
        },
      ]);

      const result = await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [MAPPING_BENCH, MAPPING_SQUAT],
        USER_ID
      );

      expect(result.imported).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      const insertSessionCalls = (db.runAsync as jest.Mock).mock.calls.filter(
        ([sql]: [string]) => sql.includes('INSERT INTO sessions')
      );
      expect(insertSessionCalls).toHaveLength(3);

      const insertSetLogCalls = (db.runAsync as jest.Mock).mock.calls.filter(
        ([sql]: [string]) => sql.includes('INSERT INTO set_logs')
      );
      expect(insertSetLogCalls).toHaveLength(6);
    });

    it('sets pre_session_notes to "Importé depuis Hevy" on each session', async () => {
      const db = makeMockDb();

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Bench Press',
          sets: [{ setOrder: 1, weightKg: 80, reps: 8 }],
        },
      ]);

      await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [MAPPING_BENCH],
        USER_ID
      );

      const insertSessionCall = (db.runAsync as jest.Mock).mock.calls.find(
        ([sql]: [string]) => sql.includes('INSERT INTO sessions')
      );
      expect(insertSessionCall).toBeDefined();
      const params = insertSessionCall![1] as unknown[];
      const preNotesIndex = params.indexOf('Importé depuis Hevy');
      expect(preNotesIndex).toBeGreaterThan(-1);
    });

    it('sets status=completed and workout_day_id=null on sessions', async () => {
      const db = makeMockDb();

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Bench Press',
          sets: [{ setOrder: 1, weightKg: 80, reps: 8 }],
        },
      ]);

      await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [MAPPING_BENCH],
        USER_ID
      );

      const insertSessionCall = (db.runAsync as jest.Mock).mock.calls.find(
        ([sql]: [string]) => sql.includes('INSERT INTO sessions')
      );
      expect(insertSessionCall).toBeDefined();
      const params = insertSessionCall![1] as unknown[];
      const completedIndex = params.indexOf('completed');
      expect(completedIndex).toBeGreaterThan(-1);
      const nullWorkoutDayIndex = params.indexOf(null);
      expect(nullWorkoutDayIndex).toBeGreaterThan(-1);
    });

    it('sets rir=null and completed=1 on each set_log', async () => {
      const db = makeMockDb();

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Bench Press',
          sets: [
            { setOrder: 1, weightKg: 80, reps: 8 },
            { setOrder: 2, weightKg: 80, reps: 6 },
          ],
        },
      ]);

      await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [MAPPING_BENCH],
        USER_ID
      );

      const setLogCalls = (db.runAsync as jest.Mock).mock.calls.filter(
        ([sql]: [string]) => sql.includes('INSERT INTO set_logs')
      );
      expect(setLogCalls).toHaveLength(2);

      for (const call of setLogCalls) {
        const params = call[1] as unknown[];
        expect(params).toContain(1);
        const rirIndex = 10;
        expect(params[rirIndex]).toBeNull();
      }
    });
  });

  describe('deduplication', () => {
    it('skips session when same date + exercise_ids already in DB', async () => {
      const db = makeMockDb({
        existingSessions: [{ id: 'existing-session-id' }],
        existingSetLogs: [{ exercise_id: 'ex-bench' }],
      });

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Bench Press',
          sets: [{ setOrder: 1, weightKg: 80, reps: 8 }],
        },
      ]);

      const result = await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [MAPPING_BENCH],
        USER_ID
      );

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(0);

      const insertSessionCalls = (db.runAsync as jest.Mock).mock.calls.filter(
        ([sql]: [string]) => sql.includes('INSERT INTO sessions')
      );
      expect(insertSessionCalls).toHaveLength(0);
    });

    it('imports session when same date but different exercise_ids', async () => {
      const db = makeMockDb({
        existingSessions: [{ id: 'existing-session-id' }],
        existingSetLogs: [{ exercise_id: 'ex-squat' }],
      });

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Bench Press',
          sets: [{ setOrder: 1, weightKg: 80, reps: 8 }],
        },
      ]);

      const result = await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [MAPPING_BENCH],
        USER_ID
      );

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
    });
  });

  describe('exercise not found in DB', () => {
    it('returns ImportError when exercise is not in mapping index', async () => {
      const db = makeMockDb();

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Unknown Exercise',
          sets: [{ setOrder: 1, weightKg: 50, reps: 10 }],
        },
      ]);

      const result = await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [],
        USER_ID
      );

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].reason).toBe('exercise_not_found');
      expect(result.errors[0].exerciseName).toBe('Unknown Exercise');
      expect(result.errors[0].sessionDate).toBe('2026-01-10');
    });

    it('continues importing other sessions when one has unmapped exercise', async () => {
      const db = makeMockDb();

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Unknown Exercise',
          sets: [{ setOrder: 1, weightKg: 50, reps: 10 }],
        },
        {
          date: '2026-01-12',
          exerciseName: 'Bench Press',
          sets: [{ setOrder: 1, weightKg: 80, reps: 8 }],
        },
      ]);

      const result = await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [MAPPING_BENCH],
        USER_ID
      );

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].exerciseName).toBe('Unknown Exercise');
    });
  });

  describe('ignored exercises', () => {
    it('skips sessions with ignored exercises and counts them as skipped', async () => {
      const db = makeMockDb();

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Unknown Exercise',
          sets: [{ setOrder: 1, weightKg: 50, reps: 10 }],
        },
        {
          date: '2026-01-12',
          exerciseName: 'Bench Press',
          sets: [{ setOrder: 1, weightKg: 80, reps: 8 }],
        },
      ]);

      const result = await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [MAPPING_BENCH, MAPPING_IGNORED],
        USER_ID
      );

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('sync queue', () => {
    it('enqueues imported sessions into sync queue', async () => {
      const db = makeMockDb();

      const parsedData = makeParsedData([
        {
          date: '2026-01-10',
          exerciseName: 'Bench Press',
          sets: [{ setOrder: 1, weightKg: 80, reps: 8 }],
        },
      ]);

      await importHevySessions(
        db as unknown as SQLiteDatabase,
        parsedData,
        [MAPPING_BENCH],
        USER_ID
      );

      const syncQueueCalls = (db.runAsync as jest.Mock).mock.calls.filter(
        ([sql]: [string]) => sql.includes('INSERT INTO sync_queue')
      );
      expect(syncQueueCalls.length).toBeGreaterThan(0);

      const sessionSyncCall = syncQueueCalls.find(([, params]) => {
        const paramsArr = params as unknown[];
        return paramsArr[0] === 'sessions' && paramsArr[2] === 'insert';
      });
      expect(sessionSyncCall).toBeDefined();
    });
  });
});
