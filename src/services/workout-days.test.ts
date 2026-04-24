import {
  deleteWorkoutDay,
  getWorkoutDayById,
  getWorkoutDaysByBlockId,
  insertWorkoutDay,
  updateWorkoutDay,
} from './workout-days';
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

describe('workout_days repository', () => {
  describe('insertWorkoutDay', () => {
    it('inserts with null split_type and null estimated_duration_min by default', async () => {
      const db = makeMockDb();
      const day = await insertWorkoutDay(db, {
        id: 'wd1',
        blockId: 'b1',
        title: 'Push A',
        dayOrder: 0,
      });
      expect(day.splitType).toBeNull();
      expect(day.estimatedDurationMin).toBeNull();
      expect(day.dayOrder).toBe(0);
      expect(db.runAsync).toHaveBeenCalledTimes(2);
    });

    it('serializes split_type to payload snake_case', async () => {
      const db = makeMockDb();
      await insertWorkoutDay(db, {
        id: 'wd2',
        blockId: 'b1',
        title: 'Upper 1',
        dayOrder: 1,
        splitType: 'upper',
        estimatedDurationMin: 60,
      });
      const payload = JSON.parse(
        (db.runAsync.mock.calls[1] as [string, unknown[]])[1][3] as string
      );
      expect(payload).toMatchObject({
        id: 'wd2',
        block_id: 'b1',
        day_order: 1,
        split_type: 'upper',
        estimated_duration_min: 60,
      });
    });
  });

  describe('updateWorkoutDay', () => {
    it('returns null if missing', async () => {
      const db = makeMockDb();
      expect(
        await updateWorkoutDay(db, 'x', { title: 'new' })
      ).toBeNull();
    });

    it('allows setting split_type to null explicitly', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'wd1',
        block_id: 'b1',
        title: 'Push',
        day_order: 0,
        split_type: 'push',
        estimated_duration_min: 60,
        created_at: '2026-04-01T00:00:00.000Z',
      });
      const updated = await updateWorkoutDay(db, 'wd1', { splitType: null });
      expect(updated?.splitType).toBeNull();
    });
  });

  describe('deleteWorkoutDay', () => {
    it('enqueues a delete record', async () => {
      const db = makeMockDb();
      await deleteWorkoutDay(db, 'wd1');
      const params = db.runAsync.mock.calls[1][1] as unknown[];
      expect(params[2]).toBe('delete');
      expect(JSON.parse(params[3] as string)).toEqual({ id: 'wd1' });
    });
  });

  describe('getWorkoutDayById', () => {
    it('maps row correctly', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'wd1',
        block_id: 'b1',
        title: 'Push A',
        day_order: 0,
        split_type: 'push',
        estimated_duration_min: 75,
        created_at: '2026-04-01T00:00:00.000Z',
      });
      const day = await getWorkoutDayById(db, 'wd1');
      expect(day).toEqual({
        id: 'wd1',
        blockId: 'b1',
        title: 'Push A',
        dayOrder: 0,
        splitType: 'push',
        estimatedDurationMin: 75,
        createdAt: '2026-04-01T00:00:00.000Z',
      });
    });
  });

  describe('getWorkoutDaysByBlockId', () => {
    it('orders by day_order ASC', async () => {
      const db = makeMockDb();
      await getWorkoutDaysByBlockId(db, 'b1');
      const call = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(call[0]).toContain('block_id = ?');
      expect(call[0]).toContain('ORDER BY day_order ASC');
    });

    it('returns empty array when no days', async () => {
      const db = makeMockDb();
      expect(await getWorkoutDaysByBlockId(db, 'b1')).toEqual([]);
    });
  });
});
