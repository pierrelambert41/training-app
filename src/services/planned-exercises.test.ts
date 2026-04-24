import {
  deletePlannedExercise,
  getPlannedExerciseById,
  getPlannedExercisesByWorkoutDayId,
  insertPlannedExercise,
  updatePlannedExercise,
} from './planned-exercises';
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

const DOUBLE_PROGRESSION_CONFIG = {
  increment_kg: 2.5,
  min_reps: 6,
  max_reps: 8,
  all_sets_at_max_to_increase: true,
  regressions_before_alert: 2,
};

describe('planned_exercises repository', () => {
  describe('insertPlannedExercise', () => {
    it('stringifies progressionConfig in SQLite but keeps it as object in sync payload', async () => {
      const db = makeMockDb();
      const pe = await insertPlannedExercise(db, {
        id: 'pe1',
        workoutDayId: 'wd1',
        exerciseId: 'e1',
        exerciseOrder: 0,
        role: 'main',
        sets: 4,
        repRangeMin: 6,
        repRangeMax: 8,
        targetRir: 2,
        restSeconds: 180,
        tempo: '3-1-1-0',
        progressionType: 'double_progression',
        progressionConfig: DOUBLE_PROGRESSION_CONFIG,
      });

      expect(pe.progressionConfig).toEqual(DOUBLE_PROGRESSION_CONFIG);

      // SQLite INSERT: progression_config est stringifié
      const insertParams = db.runAsync.mock.calls[0][1] as unknown[];
      expect(typeof insertParams[12]).toBe('string');
      expect(JSON.parse(insertParams[12] as string)).toEqual(
        DOUBLE_PROGRESSION_CONFIG
      );

      // Sync payload: progressionConfig reste un objet (jsonb côté Supabase)
      const syncParams = db.runAsync.mock.calls[1][1] as unknown[];
      const payload = JSON.parse(syncParams[3] as string);
      expect(payload.progression_config).toEqual(DOUBLE_PROGRESSION_CONFIG);
      expect(typeof payload.progression_config).toBe('object');
    });

    it('enforces rep range invariant (min <= max)', async () => {
      const db = makeMockDb();
      await expect(
        insertPlannedExercise(db, {
          id: 'pe2',
          workoutDayId: 'wd1',
          exerciseId: 'e1',
          exerciseOrder: 0,
          role: 'accessory',
          sets: 3,
          repRangeMin: 15,
          repRangeMax: 10, // invalid
          progressionType: 'accessory_linear',
          progressionConfig: {},
        })
      ).rejects.toThrow(/Invalid rep range/);
      expect(db.runAsync).not.toHaveBeenCalled();
    });

    it('accepts the 6 progressionType values', async () => {
      const types = [
        'strength_fixed',
        'double_progression',
        'accessory_linear',
        'bodyweight_progression',
        'duration_progression',
        'distance_duration',
      ] as const;

      for (const progressionType of types) {
        const db = makeMockDb();
        const pe = await insertPlannedExercise(db, {
          id: `pe-${progressionType}`,
          workoutDayId: 'wd1',
          exerciseId: 'e1',
          exerciseOrder: 0,
          role: 'main',
          sets: 3,
          repRangeMin: 5,
          repRangeMax: 10,
          progressionType,
          progressionConfig: {},
        });
        expect(pe.progressionType).toBe(progressionType);
      }
    });

    it('supports the 3 role values', async () => {
      const roles = ['main', 'secondary', 'accessory'] as const;
      for (const role of roles) {
        const db = makeMockDb();
        const pe = await insertPlannedExercise(db, {
          id: `pe-${role}`,
          workoutDayId: 'wd1',
          exerciseId: 'e1',
          exerciseOrder: 0,
          role,
          sets: 3,
          repRangeMin: 5,
          repRangeMax: 10,
          progressionType: 'accessory_linear',
          progressionConfig: {},
        });
        expect(pe.role).toBe(role);
      }
    });
  });

  describe('updatePlannedExercise', () => {
    it('returns null if missing', async () => {
      const db = makeMockDb();
      expect(
        await updatePlannedExercise(db, 'x', { sets: 5 })
      ).toBeNull();
    });

    it('rejects invalid rep range on update', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'pe1',
        workout_day_id: 'wd1',
        exercise_id: 'e1',
        exercise_order: 0,
        role: 'main',
        sets: 4,
        rep_range_min: 6,
        rep_range_max: 8,
        target_rir: 2,
        rest_seconds: 180,
        tempo: null,
        progression_type: 'double_progression',
        progression_config: JSON.stringify(DOUBLE_PROGRESSION_CONFIG),
        notes: null,
        created_at: '2026-04-01T00:00:00.000Z',
      });
      await expect(
        updatePlannedExercise(db, 'pe1', { repRangeMin: 12 })
      ).rejects.toThrow(/Invalid rep range/);
    });

    it('updates progressionConfig + stringifies for SQLite', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'pe1',
        workout_day_id: 'wd1',
        exercise_id: 'e1',
        exercise_order: 0,
        role: 'main',
        sets: 4,
        rep_range_min: 6,
        rep_range_max: 8,
        target_rir: 2,
        rest_seconds: 180,
        tempo: null,
        progression_type: 'double_progression',
        progression_config: JSON.stringify(DOUBLE_PROGRESSION_CONFIG),
        notes: null,
        created_at: '2026-04-01T00:00:00.000Z',
      });

      const newConfig = { ...DOUBLE_PROGRESSION_CONFIG, increment_kg: 5 };
      const updated = await updatePlannedExercise(db, 'pe1', {
        progressionConfig: newConfig,
      });
      expect(updated?.progressionConfig).toEqual(newConfig);

      const updateParams = db.runAsync.mock.calls[0][1] as unknown[];
      // 10e slot = progression_config stringifié
      expect(JSON.parse(updateParams[9] as string)).toEqual(newConfig);
    });
  });

  describe('deletePlannedExercise', () => {
    it('enqueues a delete record with minimal payload', async () => {
      const db = makeMockDb();
      await deletePlannedExercise(db, 'pe1');
      const params = db.runAsync.mock.calls[1][1] as unknown[];
      expect(params[2]).toBe('delete');
      expect(JSON.parse(params[3] as string)).toEqual({ id: 'pe1' });
    });
  });

  describe('getPlannedExerciseById', () => {
    it('parses progression_config from JSON string', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'pe1',
        workout_day_id: 'wd1',
        exercise_id: 'e1',
        exercise_order: 0,
        role: 'main',
        sets: 4,
        rep_range_min: 6,
        rep_range_max: 8,
        target_rir: 2,
        rest_seconds: 180,
        tempo: '3-1-1-0',
        progression_type: 'double_progression',
        progression_config: JSON.stringify(DOUBLE_PROGRESSION_CONFIG),
        notes: 'Focus squeeze',
        created_at: '2026-04-01T00:00:00.000Z',
      });
      const pe = await getPlannedExerciseById(db, 'pe1');
      expect(pe).toEqual({
        id: 'pe1',
        workoutDayId: 'wd1',
        exerciseId: 'e1',
        exerciseOrder: 0,
        role: 'main',
        sets: 4,
        repRangeMin: 6,
        repRangeMax: 8,
        targetRir: 2,
        restSeconds: 180,
        tempo: '3-1-1-0',
        progressionType: 'double_progression',
        progressionConfig: DOUBLE_PROGRESSION_CONFIG,
        notes: 'Focus squeeze',
        createdAt: '2026-04-01T00:00:00.000Z',
      });
    });

    it('falls back to empty object if progression_config is corrupted', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'pe1',
        workout_day_id: 'wd1',
        exercise_id: 'e1',
        exercise_order: 0,
        role: 'main',
        sets: 4,
        rep_range_min: 6,
        rep_range_max: 8,
        target_rir: null,
        rest_seconds: null,
        tempo: null,
        progression_type: 'double_progression',
        progression_config: '{{not-json',
        notes: null,
        created_at: '2026-04-01T00:00:00.000Z',
      });
      const pe = await getPlannedExerciseById(db, 'pe1');
      expect(pe?.progressionConfig).toEqual({});
    });
  });

  describe('getPlannedExercisesByWorkoutDayId', () => {
    it('orders by exercise_order ASC', async () => {
      const db = makeMockDb();
      await getPlannedExercisesByWorkoutDayId(db, 'wd1');
      const call = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(call[0]).toContain('workout_day_id = ?');
      expect(call[0]).toContain('ORDER BY exercise_order ASC');
    });

    it('returns empty array when no planned exercises', async () => {
      const db = makeMockDb();
      expect(await getPlannedExercisesByWorkoutDayId(db, 'wd1')).toEqual([]);
    });
  });
});
