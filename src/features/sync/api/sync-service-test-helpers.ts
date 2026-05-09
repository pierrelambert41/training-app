import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  SupabasePushBuilder,
  SupabasePushClient,
} from '../types/sync-service';

/**
 * Helpers de test partagés pour `sync-service.test.ts`.
 * Pattern colocalisé `*-test-helpers.ts` (cf. ADR-021) — l'infrastructure
 * vit dans la même couche `feature-api` que le code testé. Lintable comme
 * du code de production, ne sera jamais bundlé en runtime car uniquement
 * importé depuis des fichiers `*.test.ts`.
 */

export type QueueRow = {
  id: number;
  table_name: string;
  record_id: string;
  action: string;
  payload: string;
  created_at: string;
  synced: number;
};

export function makeQueueRow(overrides: Partial<QueueRow> = {}): QueueRow {
  return {
    id: 1,
    table_name: 'sessions',
    record_id: 'sess-1',
    action: 'insert',
    payload: JSON.stringify({ id: 'sess-1', user_id: 'u-1' }),
    created_at: '2026-05-09T10:00:00.000Z',
    synced: 0,
    ...overrides,
  };
}

export type MockDbState = {
  queueRows: QueueRow[];
  runCalls: Array<[string, unknown[]]>;
};

/**
 * Mock SQLite minimal : retourne les entrées non synced via `getAllAsync`,
 * applique localement les `UPDATE sync_queue SET synced = 1` pour que les
 * appels successifs reflètent l'état progressif. Les `runCalls` sont stockés
 * pour permettre aux tests d'asserter sur les SQL exécutés (notamment le
 * stamp `synced_at`).
 */
export function makeMockDb(state: MockDbState): SQLiteDatabase {
  return {
    getAllAsync: jest.fn(async () =>
      state.queueRows.filter((r) => r.synced === 0)
    ),
    runAsync: jest.fn(async (sql: string, params: unknown[]) => {
      state.runCalls.push([sql, params]);
      if (sql.includes('UPDATE sync_queue SET synced = 1')) {
        const id = params[0] as number;
        const row = state.queueRows.find((r) => r.id === id);
        if (row) row.synced = 1;
      }
      return { lastInsertRowId: 0, changes: 1 };
    }),
    getFirstAsync: jest.fn(async () => null),
    execAsync: jest.fn(async () => {}),
  } as unknown as SQLiteDatabase;
}

export type StubBuilderOptions = {
  upsertError?: string | null;
  deleteError?: string | null;
  upsertThrows?: Error;
  deleteThrows?: Error;
};

export type StubBuilderHandles = {
  builder: SupabasePushBuilder;
  upsert: jest.Mock;
  del: jest.Mock;
  eq: jest.Mock;
};

export function makeStubBuilder(
  opts: StubBuilderOptions = {}
): StubBuilderHandles {
  const eq = jest.fn(async () => {
    if (opts.deleteThrows) throw opts.deleteThrows;
    return { error: opts.deleteError ? { message: opts.deleteError } : null };
  });
  const del = jest.fn(() => ({ eq }));
  const upsert = jest.fn(async () => {
    if (opts.upsertThrows) throw opts.upsertThrows;
    return { error: opts.upsertError ? { message: opts.upsertError } : null };
  });
  return {
    builder: { upsert, delete: del } as unknown as SupabasePushBuilder,
    upsert,
    del,
    eq,
  };
}

export function makeSupabaseStub(
  builderByTable: Record<string, SupabasePushBuilder>
): { client: SupabasePushClient; from: jest.Mock } {
  const from = jest.fn((table: string) => {
    const b = builderByTable[table];
    if (!b) {
      throw new Error(`No stub builder for table ${table}`);
    }
    return b;
  });
  return { client: { from }, from };
}
