import type { SQLiteDatabase } from 'expo-sqlite';
import { safeEnqueue } from './safe-enqueue';

function makeMockDb(overrides?: Partial<SQLiteDatabase>): SQLiteDatabase {
  return {
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    execAsync: jest.fn(async () => {}),
    ...overrides,
  } as unknown as SQLiteDatabase;
}

describe('safeEnqueue', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('delegates to enqueueSyncRecord with a JSON payload row', async () => {
    const db = makeMockDb();

    await safeEnqueue(db, 'exercises', 'abc-123', 'insert', {
      id: 'abc-123',
      name: 'Custom Curl',
    });

    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = (db.runAsync as jest.Mock).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('INSERT INTO sync_queue');
    expect(params[0]).toBe('exercises');
    expect(params[2]).toBe('insert');
  });

  // Invariant ADR-012 : un échec d'enqueue NE DOIT JAMAIS faire rejeter safeEnqueue.
  // L'écriture locale qui précède reste préservée — la sync engine rejouera depuis l'état local.
  it('swallows errors from enqueueSyncRecord (ADR-012 — never rollback local write)', async () => {
    const db = makeMockDb({
      runAsync: jest.fn(() => Promise.reject(new Error('DB error'))),
    } as Partial<SQLiteDatabase>);

    await expect(
      safeEnqueue(db, 'exercises', 'abc-123', 'insert', { id: 'abc-123' })
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    const [message, err] = warnSpy.mock.calls[0] as [string, Error];
    expect(message).toContain('exercises');
    expect(message).toContain('insert');
    expect(message).toContain('local write preserved');
    expect((err as Error).message).toBe('DB error');
  });
});
