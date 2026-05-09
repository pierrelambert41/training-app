import type { SQLiteDatabase } from 'expo-sqlite';
import { resolveConflict } from '../domain/conflict-resolution';
import type {
  ConflictCheckedTable,
  ConflictResolutionLog,
} from '../types/conflict';
import type { SyncQueueRecord, SyncTableName } from '../types/sync-queue';
import type { SupabasePushClient } from '../types/sync-service';
import { copyRemoteRowToLocal } from './copy-remote-row-to-local';

/**
 * Tables soumises au check de conflit last-write-wins (TA-122).
 *
 * - `sessions`, `set_logs` : comparent `updated_at` (présent en local + remote).
 * - `recommendations` : pas d'`updated_at` ni en local ni en remote, fallback
 *   sur `created_at` (append-only via ADR-020 — collision improbable mais on
 *   reste conservateur).
 *
 * Les tables programme (`programs`, `blocks`, `workout_days`,
 * `planned_exercises`) ne sont PAS dans cette liste : elles sont moins
 * sujettes aux conflits multi-device (workflow de génération séquentiel,
 * pas de mutation parallèle attendue Phase 6). Cf. ADR-024.
 */
const CONFLICT_CHECKED_TABLES: ReadonlySet<SyncTableName> = new Set<SyncTableName>([
  'sessions',
  'set_logs',
  'recommendations',
]);

const TIMESTAMP_COLUMN_BY_TABLE: Record<
  ConflictCheckedTable,
  'updated_at' | 'created_at'
> = {
  sessions: 'updated_at',
  set_logs: 'updated_at',
  recommendations: 'created_at',
};

export function isConflictCheckedTable(
  table: SyncTableName
): table is ConflictCheckedTable {
  return CONFLICT_CHECKED_TABLES.has(table);
}

export type ConflictCheckResult =
  | { kind: 'no_remote' }
  | { kind: 'local_wins'; log: ConflictResolutionLog }
  | { kind: 'remote_wins'; log: ConflictResolutionLog }
  | { kind: 'failed'; error: string };

/**
 * Étape 1 : fetch le row remote (via `select(*).eq('id', ...).maybeSingle()`).
 * Étape 2 : `resolveConflict` (fonction pure du domaine).
 * Étape 3 : si remote gagne, copy remote→local. Si copy échoue, on reste
 *           prudent : on log un warning mais on retourne `remote_wins`
 *           quand même — la donnée serveur EST la canonique, le local
 *           sera réconcilié au prochain pull.
 *
 * Pas de catch global ici : si `fetchRemoteRow` throw, le caller (sync-service)
 * convertit en `PushEntryOutcome.failed`. Idem pour `copyRemoteRowToLocal` :
 * échec → log warning, on retourne quand même `remote_wins` pour ne pas
 * pousser une donnée stale.
 */
export async function runConflictCheck(
  db: SQLiteDatabase,
  supabase: SupabasePushClient,
  entry: SyncQueueRecord,
  parsedPayload: Record<string, unknown>
): Promise<ConflictCheckResult> {
  const table = entry.tableName as ConflictCheckedTable;
  const tsColumn = TIMESTAMP_COLUMN_BY_TABLE[table];

  let remoteRow: Record<string, unknown> | null;
  try {
    remoteRow = await fetchRemoteRow(supabase, entry.tableName, entry.recordId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[sync] entry #${entry.id} (${entry.tableName}) — conflict fetch threw`,
      err
    );
    return { kind: 'failed', error: message };
  }

  if (remoteRow === null) {
    return { kind: 'no_remote' };
  }

  const remoteTimestamp = readTimestamp(remoteRow, tsColumn);
  const localTimestamp = readTimestamp(parsedPayload, tsColumn);
  const winner = resolveConflict({
    local: localTimestamp,
    remote: remoteTimestamp,
  });

  if (winner === 'no_remote') {
    return { kind: 'no_remote' };
  }

  const log: ConflictResolutionLog = {
    table,
    recordId: entry.recordId,
    winner,
    localTimestamp: localTimestamp ?? '',
    remoteTimestamp: remoteTimestamp ?? '',
    resolvedAt: new Date().toISOString(),
  };

  if (winner === 'local') {
    return { kind: 'local_wins', log };
  }

  // Remote gagne → copy remote→local. Échec ne change pas le verdict :
  // la version serveur est la vérité, le local divergera mais sera
  // réconcilié via un futur pull.
  try {
    const result = await copyRemoteRowToLocal(
      db,
      table,
      remoteRow as Parameters<typeof copyRemoteRowToLocal>[2]
    );
    if (result.changes === 0) {
      console.warn(
        `[sync] entry #${entry.id} remote-wins but local row not found (changes=0)`
      );
    }
  } catch (err) {
    console.warn(
      `[sync] entry #${entry.id} remote-wins but copy remote→local failed`,
      err
    );
  }

  return { kind: 'remote_wins', log };
}

/**
 * Fetch la ligne distante via `select(*).eq('id', recordId).maybeSingle()`.
 *
 * Une erreur Supabase (réseau, RLS) → throw (relayé en `failed` par le caller).
 * Pas de ligne → `data: null` → on retourne `null` (pas un conflit).
 */
async function fetchRemoteRow(
  supabase: SupabasePushClient,
  tableName: SyncTableName,
  recordId: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .eq('id', recordId)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data ?? null;
}

function readTimestamp(
  row: Record<string, unknown>,
  column: 'updated_at' | 'created_at'
): string | null {
  const value = row[column];
  return typeof value === 'string' ? value : null;
}
