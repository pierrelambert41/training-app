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
  /**
   * Hook optionnel pour simuler des erreurs SQLite ciblées : si la fonction
   * retourne une `Error`, `runAsync` throw cette erreur (le SQL est tout de
   * même tracé dans `runCalls`). Utilisé par exemple pour tester le chemin
   * "copyRemoteRowToLocal throw → runConflictCheck logue mais retourne
   * remote_wins quand même" sans perturber les autres SQL (mark synced, etc.).
   */
  runShouldThrow?: (sql: string, params: unknown[]) => Error | null;
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
      const maybeErr = state.runShouldThrow?.(sql, params) ?? null;
      if (maybeErr) {
        throw maybeErr;
      }
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
  /**
   * Données simulées retournées par `select(*).eq('id', ...).maybeSingle()`.
   * - `undefined` → `null` (pas de ligne remote — comportement par défaut, ce
   *   qui correspond au cas "pas de conflit" et préserve le comportement
   *   des anciens tests qui n'instanciaient pas ce champ).
   * - Objet → la ligne remote retournée (le test compose son scénario).
   */
  selectData?: Record<string, unknown> | null;
  selectError?: string | null;
  selectThrows?: Error;
};

export type StubBuilderHandles = {
  builder: SupabasePushBuilder;
  upsert: jest.Mock;
  del: jest.Mock;
  eq: jest.Mock;
  select: jest.Mock;
  selectEq: jest.Mock;
  maybeSingle: jest.Mock;
};

export function makeStubBuilder(
  opts: StubBuilderOptions = {}
): StubBuilderHandles {
  // Branche delete : `.delete().eq(col, val)` → Promise<{ error }>
  const eq = jest.fn(async () => {
    if (opts.deleteThrows) throw opts.deleteThrows;
    return { error: opts.deleteError ? { message: opts.deleteError } : null };
  });
  const del = jest.fn(() => ({ eq }));

  // Branche upsert : `.upsert(payload, options)` → Promise<{ error }>
  const upsert = jest.fn(async () => {
    if (opts.upsertThrows) throw opts.upsertThrows;
    return { error: opts.upsertError ? { message: opts.upsertError } : null };
  });

  // Branche select : `.select(cols).eq(col, val).maybeSingle()` → Promise<{ data, error }>
  const maybeSingle = jest.fn(async () => {
    if (opts.selectThrows) throw opts.selectThrows;
    if (opts.selectError) {
      return { data: null, error: { message: opts.selectError } };
    }
    const data = opts.selectData === undefined ? null : opts.selectData;
    return { data, error: null };
  });
  const selectEq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq: selectEq }));

  return {
    builder: {
      upsert,
      delete: del,
      select,
    } as unknown as SupabasePushBuilder,
    upsert,
    del,
    eq,
    select,
    selectEq,
    maybeSingle,
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
