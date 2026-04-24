import {
  deleteBlock,
  getBlockById,
  getBlocksByProgramId,
  getBlocksByStatus,
  insertBlock,
  updateBlock,
} from './blocks';
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

describe('blocks repository', () => {
  describe('insertBlock', () => {
    it('inserts with defaults (week_number=1, status=planned, deload_strategy=fatigue_triggered)', async () => {
      const db = makeMockDb();
      const block = await insertBlock(db, {
        id: 'b1',
        programId: 'p1',
        title: 'Hypertrophy Block',
        goal: 'hypertrophy',
        durationWeeks: 6,
      });

      expect(block.weekNumber).toBe(1);
      expect(block.status).toBe('planned');
      expect(block.deloadStrategy).toBe('fatigue_triggered');
      expect(block.startDate).toBeNull();
      expect(block.endDate).toBeNull();
      expect(db.runAsync).toHaveBeenCalledTimes(2);
    });

    it('supports deloaded status explicitly', async () => {
      const db = makeMockDb();
      const block = await insertBlock(db, {
        id: 'b2',
        programId: 'p1',
        title: 'Deload Week',
        goal: 'deload',
        durationWeeks: 1,
        status: 'deloaded',
      });
      expect(block.status).toBe('deloaded');
      const syncParams = db.runAsync.mock.calls[1][1] as unknown[];
      const payload = JSON.parse(syncParams[3] as string);
      expect(payload.status).toBe('deloaded');
    });

    it('payload Supabase uses snake_case keys', async () => {
      const db = makeMockDb();
      await insertBlock(db, {
        id: 'b3',
        programId: 'p1',
        title: 'Block',
        goal: 'strength',
        durationWeeks: 4,
        weekNumber: 2,
        startDate: '2026-05-01',
        endDate: '2026-05-28',
        deloadStrategy: 'scheduled',
      });
      const payload = JSON.parse(
        (db.runAsync.mock.calls[1] as [string, unknown[]])[1][3] as string
      );
      expect(payload).toMatchObject({
        id: 'b3',
        program_id: 'p1',
        duration_weeks: 4,
        week_number: 2,
        start_date: '2026-05-01',
        end_date: '2026-05-28',
        deload_strategy: 'scheduled',
      });
    });
  });

  describe('updateBlock', () => {
    it('returns null if block missing', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(null);
      expect(await updateBlock(db, 'x', { status: 'active' })).toBeNull();
    });

    it('transitions status planned → active and enqueues update', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'b1',
        program_id: 'p1',
        title: 'Block',
        goal: 'hypertrophy',
        duration_weeks: 6,
        week_number: 1,
        start_date: null,
        end_date: null,
        status: 'planned',
        deload_strategy: 'fatigue_triggered',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      });

      const updated = await updateBlock(db, 'b1', { status: 'active' });
      expect(updated?.status).toBe('active');
      expect(updated?.updatedAt).not.toBe('2026-04-01T00:00:00.000Z');

      const syncParams = db.runAsync.mock.calls[1][1] as unknown[];
      expect(syncParams[2]).toBe('update');
      const payload = JSON.parse(syncParams[3] as string);
      expect(payload.status).toBe('active');
    });
  });

  describe('deleteBlock', () => {
    it('enqueues a delete record', async () => {
      const db = makeMockDb();
      await deleteBlock(db, 'b1');
      const calls = db.runAsync.mock.calls;
      expect((calls[0] as [string, unknown[]])[0]).toContain(
        'DELETE FROM blocks'
      );
      const params = calls[1][1] as unknown[];
      expect(params[2]).toBe('delete');
      expect(JSON.parse(params[3] as string)).toEqual({ id: 'b1' });
    });
  });

  describe('getBlockById', () => {
    it('maps row correctly including deloaded status', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'b1',
        program_id: 'p1',
        title: 'Block',
        goal: 'hypertrophy',
        duration_weeks: 6,
        week_number: 3,
        start_date: '2026-04-01',
        end_date: '2026-05-13',
        status: 'deloaded',
        deload_strategy: 'fatigue_triggered',
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-15T00:00:00.000Z',
      });
      const block = await getBlockById(db, 'b1');
      expect(block).toEqual({
        id: 'b1',
        programId: 'p1',
        title: 'Block',
        goal: 'hypertrophy',
        durationWeeks: 6,
        weekNumber: 3,
        startDate: '2026-04-01',
        endDate: '2026-05-13',
        status: 'deloaded',
        deloadStrategy: 'fatigue_triggered',
        createdAt: '2026-04-01T00:00:00.000Z',
        updatedAt: '2026-04-15T00:00:00.000Z',
      });
    });
  });

  describe('getBlocksByProgramId', () => {
    it('filters by program_id and orders by created_at ASC', async () => {
      const db = makeMockDb();
      await getBlocksByProgramId(db, 'p1');
      const call = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(call[0]).toContain('program_id = ?');
      expect(call[0]).toContain('ORDER BY created_at ASC');
      expect(call[1]).toEqual(['p1']);
    });

    it('returns empty array when no blocks', async () => {
      const db = makeMockDb();
      expect(await getBlocksByProgramId(db, 'p1')).toEqual([]);
    });
  });

  describe('getBlocksByStatus', () => {
    it('filters by program_id AND status', async () => {
      const db = makeMockDb();
      await getBlocksByStatus(db, 'p1', 'active');
      const call = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(call[0]).toContain('program_id = ? AND status = ?');
      expect(call[1]).toEqual(['p1', 'active']);
    });
  });
});
