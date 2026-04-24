import {
  deleteProgram,
  getActiveProgramForUser,
  getProgramById,
  getProgramsByUserId,
  insertProgram,
  updateProgram,
} from './programs';
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

function sqlCalls(db: MockDb): string[] {
  return (db.runAsync.mock.calls as unknown as [string, unknown[]][]).map(
    ([sql]) => sql
  );
}

describe('programs repository', () => {
  describe('insertProgram', () => {
    it('inserts a row with serialized boolean and enqueues a sync record', async () => {
      const db = makeMockDb();

      const program = await insertProgram(db, {
        id: 'p1',
        userId: 'u1',
        title: 'Push Pull Legs',
        goal: 'hypertrophy',
        frequency: 6,
        level: 'intermediate',
        isActive: true,
      });

      expect(program.id).toBe('p1');
      expect(program.isActive).toBe(true);
      expect(program.createdAt).toBe(program.updatedAt);

      // 2 SQL calls : INSERT programs + INSERT sync_queue
      expect(db.runAsync).toHaveBeenCalledTimes(2);
      const calls = db.runAsync.mock.calls;

      // 1er call : INSERT programs
      const insertCall = calls[0] as [string, unknown[]];
      expect(insertCall[0]).toContain('INSERT INTO programs');
      // is_active = 1 (index 6 dans params)
      expect(insertCall[1][6]).toBe(1);

      // 2e call : INSERT sync_queue
      const syncCall = calls[1] as [string, unknown[]];
      expect(syncCall[0]).toContain('INSERT INTO sync_queue');
      expect(syncCall[1][0]).toBe('programs');
      expect(syncCall[1][1]).toBe('p1');
      expect(syncCall[1][2]).toBe('insert');
      const payload = JSON.parse(syncCall[1][3] as string);
      expect(payload).toMatchObject({
        id: 'p1',
        user_id: 'u1',
        title: 'Push Pull Legs',
        goal: 'hypertrophy',
        frequency: 6,
        level: 'intermediate',
        is_active: true, // boolean dans le payload Supabase, pas 0/1
      });
    });

    it('defaults is_active to false when omitted', async () => {
      const db = makeMockDb();
      const program = await insertProgram(db, {
        id: 'p2',
        userId: 'u1',
        title: 'Upper Lower',
        goal: 'strength',
        frequency: 4,
        level: 'beginner',
      });
      expect(program.isActive).toBe(false);
      const payload = JSON.parse(
        (db.runAsync.mock.calls[1] as [string, unknown[]])[1][3] as string
      );
      expect(payload.is_active).toBe(false);
    });

    it('does not throw when enqueueSyncRecord fails — local write preserved', async () => {
      let callCount = 0;
      const db = makeMockDb({
        runAsync: jest.fn(async (sql: string) => {
          callCount++;
          if (callCount === 2 && sql.includes('sync_queue')) {
            throw new Error('sync_queue write failed');
          }
          return { lastInsertRowId: 1, changes: 1 };
        }),
      } as Partial<SQLiteDatabase>);

      await expect(
        insertProgram(db, {
          id: 'p3',
          userId: 'u1',
          title: 'Full Body',
          goal: 'mixed',
          frequency: 3,
          level: null,
        })
      ).resolves.toBeDefined();
    });
  });

  describe('updateProgram', () => {
    it('returns null if program does not exist', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(null);

      const result = await updateProgram(db, 'missing', { title: 'New' });
      expect(result).toBeNull();
      expect(db.runAsync).not.toHaveBeenCalled();
    });

    it('updates fields and refreshes updated_at + enqueues update', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'p1',
        user_id: 'u1',
        title: 'Old',
        goal: 'hypertrophy',
        frequency: 6,
        level: 'intermediate',
        is_active: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      });

      const updated = await updateProgram(db, 'p1', {
        title: 'New Title',
        isActive: true,
      });

      expect(updated?.title).toBe('New Title');
      expect(updated?.isActive).toBe(true);
      expect(updated?.updatedAt).not.toBe('2026-01-01T00:00:00.000Z');

      const calls = sqlCalls(db);
      expect(calls[0]).toContain('UPDATE programs');
      expect(calls[1]).toContain('INSERT INTO sync_queue');

      const syncParams = db.runAsync.mock.calls[1][1] as unknown[];
      expect(syncParams[2]).toBe('update');
      const payload = JSON.parse(syncParams[3] as string);
      expect(payload.is_active).toBe(true);
      expect(payload.title).toBe('New Title');
    });
  });

  describe('deleteProgram', () => {
    it('deletes and enqueues a delete record with minimal payload', async () => {
      const db = makeMockDb();
      await deleteProgram(db, 'p1');

      const calls = sqlCalls(db);
      expect(calls[0]).toContain('DELETE FROM programs');
      expect(calls[1]).toContain('INSERT INTO sync_queue');
      const params = db.runAsync.mock.calls[1][1] as unknown[];
      expect(params[2]).toBe('delete');
      expect(JSON.parse(params[3] as string)).toEqual({ id: 'p1' });
    });
  });

  describe('getProgramById', () => {
    it('returns null when not found', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(null);
      expect(await getProgramById(db, 'x')).toBeNull();
    });

    it('maps row to Program with boolean isActive', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'p1',
        user_id: 'u1',
        title: 'PPL',
        goal: 'hypertrophy',
        frequency: 6,
        level: 'intermediate',
        is_active: 1,
        created_at: '2026-04-24T00:00:00.000Z',
        updated_at: '2026-04-24T00:00:00.000Z',
      });
      const result = await getProgramById(db, 'p1');
      expect(result).toEqual({
        id: 'p1',
        userId: 'u1',
        title: 'PPL',
        goal: 'hypertrophy',
        frequency: 6,
        level: 'intermediate',
        isActive: true,
        createdAt: '2026-04-24T00:00:00.000Z',
        updatedAt: '2026-04-24T00:00:00.000Z',
      });
    });
  });

  describe('getProgramsByUserId', () => {
    it('returns empty array when no programs', async () => {
      const db = makeMockDb();
      db.getAllAsync.mockResolvedValueOnce([]);
      const programs = await getProgramsByUserId(db, 'u1');
      expect(programs).toEqual([]);
    });

    it('filters by user_id and orders by created_at DESC', async () => {
      const db = makeMockDb();
      db.getAllAsync.mockResolvedValueOnce([]);
      await getProgramsByUserId(db, 'u1');
      const call = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(call[0]).toContain('user_id = ?');
      expect(call[0]).toContain('ORDER BY created_at DESC');
      expect(call[1]).toEqual(['u1']);
    });
  });

  describe('getActiveProgramForUser', () => {
    it('queries is_active = 1 and returns the program', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce({
        id: 'p1',
        user_id: 'u1',
        title: 'Active',
        goal: 'hypertrophy',
        frequency: 5,
        level: 'intermediate',
        is_active: 1,
        created_at: '2026-04-01T00:00:00.000Z',
        updated_at: '2026-04-01T00:00:00.000Z',
      });
      const program = await getActiveProgramForUser(db, 'u1');
      expect(program?.id).toBe('p1');
      const call = db.getFirstAsync.mock.calls[0] as [string, unknown[]];
      expect(call[0]).toContain('is_active = 1');
      expect(call[0]).toContain('LIMIT 1');
    });
  });
});
