import { enqueueSyncRecord, getPendingSyncRecords } from './sync-queue';
import type { SQLiteDatabase } from 'expo-sqlite';

function makeMockDb(overrides?: Partial<SQLiteDatabase>): SQLiteDatabase {
  return {
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    execAsync: jest.fn(async () => {}),
    ...overrides,
  } as unknown as SQLiteDatabase;
}

describe('enqueueSyncRecord', () => {
  it('inserts a row in sync_queue with synced = 0', async () => {
    const db = makeMockDb();

    await enqueueSyncRecord(db, 'exercises', 'abc-123', 'insert', {
      id: 'abc-123',
      name: 'Custom Curl',
      is_custom: true,
    });

    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = (db.runAsync as jest.Mock).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('INSERT INTO sync_queue');
    expect(sql).toContain('synced');
    expect(sql).toContain('0');
    expect(params[0]).toBe('exercises');
    expect(params[1]).toBe('abc-123');
    expect(params[2]).toBe('insert');
    const payload = JSON.parse(params[3] as string);
    expect(payload.id).toBe('abc-123');
    expect(payload.name).toBe('Custom Curl');
    expect(payload.is_custom).toBe(true);
  });

  it('serializes the payload as JSON', async () => {
    const db = makeMockDb();
    const payloadObj = { id: 'xyz', name: 'Test', equipment: ['barbell'] };

    await enqueueSyncRecord(db, 'exercises', 'xyz', 'insert', payloadObj);

    const [, params] = (db.runAsync as jest.Mock).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(typeof params[3]).toBe('string');
    expect(JSON.parse(params[3] as string)).toEqual(payloadObj);
  });
});

describe('getPendingSyncRecords', () => {
  it('returns mapped records for unsynced rows', async () => {
    const db = makeMockDb({
      getAllAsync: jest.fn(async () => [
        {
          id: 1,
          table_name: 'exercises',
          record_id: 'abc-123',
          action: 'insert',
          payload: '{"id":"abc-123","name":"Custom Curl"}',
          created_at: '2026-04-24T10:00:00.000Z',
          synced: 0,
        },
      ]),
    } as Partial<SQLiteDatabase>);

    const records = await getPendingSyncRecords(db);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      id: 1,
      tableName: 'exercises',
      recordId: 'abc-123',
      action: 'insert',
      synced: false,
    });
  });

  it('queries only unsynced rows ordered by created_at ASC', async () => {
    const db = makeMockDb();

    await getPendingSyncRecords(db);

    const [sql] = (db.getAllAsync as jest.Mock).mock.calls[0] as [string];
    expect(sql).toContain('synced = 0');
    expect(sql).toContain('ORDER BY created_at ASC');
  });

  it('returns empty array when no pending records', async () => {
    const db = makeMockDb({ getAllAsync: jest.fn(async () => []) } as Partial<SQLiteDatabase>);
    const records = await getPendingSyncRecords(db);
    expect(records).toEqual([]);
  });
});
