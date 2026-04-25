import type { SQLiteDatabase } from 'expo-sqlite';
import { getOrCreateDeviceId } from './device-id';

type Row = { value: string };

function makeMockDb(initial?: string): SQLiteDatabase {
  let stored: string | undefined = initial;

  return {
    getFirstAsync: jest.fn(async () =>
      stored ? ({ value: stored } as Row) : null
    ),
    runAsync: jest.fn(async (_sql: string, params: unknown[]) => {
      // INSERT OR IGNORE — n'écrase pas si déjà présent.
      if (stored === undefined) {
        stored = params[1] as string;
      }
      return { lastInsertRowId: 1, changes: 1 };
    }),
    getAllAsync: jest.fn(async () => []),
    execAsync: jest.fn(async () => {}),
  } as unknown as SQLiteDatabase;
}

describe('getOrCreateDeviceId', () => {
  it('returns the existing device_id when already persisted', async () => {
    const db = makeMockDb('existing-device-uuid');

    const id = await getOrCreateDeviceId(db);

    expect(id).toBe('existing-device-uuid');
    expect(db.runAsync).not.toHaveBeenCalled();
  });

  it('generates a UUID v4 and persists it on first call', async () => {
    const db = makeMockDb();

    const id = await getOrCreateDeviceId(db);

    // RFC 4122 v4 format (8-4-4-4-12 hex with version nibble = 4 and variant nibble in 8/9/a/b)
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    expect(db.runAsync).toHaveBeenCalledTimes(1);
    const [sql, params] = (db.runAsync as jest.Mock).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain('INSERT OR IGNORE INTO app_meta');
    expect(params[0]).toBe('device_id');
    expect(params[1]).toBe(id);
  });

  it('is idempotent : calling twice returns the same id', async () => {
    const db = makeMockDb();

    const first = await getOrCreateDeviceId(db);
    const second = await getOrCreateDeviceId(db);

    expect(first).toBe(second);
    // 1 INSERT lors du 1er appel, 0 lors du 2ᵉ.
    expect(db.runAsync).toHaveBeenCalledTimes(1);
  });

  it('respects the persisted value if a concurrent insert occurred', async () => {
    // Scénario : le SELECT initial ne trouve rien ; entre temps un autre
    // appel a inséré une valeur ; le re-read final doit retourner cette
    // valeur, pas notre candidat local.
    let firstSelect = true;
    const db = {
      getFirstAsync: jest.fn(async () => {
        if (firstSelect) {
          firstSelect = false;
          return null;
        }
        return { value: 'concurrent-winner-uuid' };
      }),
      runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 0 })),
      getAllAsync: jest.fn(async () => []),
      execAsync: jest.fn(async () => {}),
    } as unknown as SQLiteDatabase;

    const id = await getOrCreateDeviceId(db);
    expect(id).toBe('concurrent-winner-uuid');
  });
});
