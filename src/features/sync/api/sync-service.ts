import type { SQLiteDatabase } from 'expo-sqlite';
import type { SyncQueueRecord, SyncTableName } from '../types/sync-queue';
import type {
  PushEntryOutcome,
  PushResult,
  SupabasePushClient,
} from '../types/sync-service';
import { getPendingSyncRecords } from './sync-queue';

/**
 * Tables qui possèdent une colonne `synced_at` côté SQLite locale ET côté
 * Supabase. Pour ces tables uniquement, après un upsert réussi on patche
 * la ligne source pour la marquer "vue par le serveur" (timestamp local
 * approximatif — TA-120 hors scope : récupérer le timestamp serveur réel).
 *
 * Ne pas étendre cette liste sans ajouter la colonne dans la migration
 * SQLite correspondante (cf. src/services/db.ts).
 */
const TABLES_WITH_SYNCED_AT: ReadonlySet<SyncTableName> = new Set([
  'sessions',
]);

type SyncServiceDeps = {
  supabase: SupabasePushClient;
};

/**
 * Service de synchronisation push : SQLite → Supabase.
 *
 * Responsabilités (TA-120) :
 * - `getUnsynced(db)` : retourne les entrées `sync_queue` avec `synced=0`,
 *   ordonnées causalement (created_at ASC).
 * - `push(db)` : envoie chaque entrée vers Supabase (upsert pour insert/update,
 *   delete pour delete), marque les entrées traitées comme synced.
 *
 * Garanties :
 * - **Idempotence** : on utilise `upsert(onConflict: 'id')` pour insert/update
 *   et `delete().eq('id', recordId)` (no-op silencieux si absent côté serveur).
 * - **Pas de perte** : une entrée n'est marquée `synced=1` qu'après confirmation
 *   Supabase. Erreur réseau → l'entrée reste en queue et sera rejouée.
 * - **Non fail-fast** : une erreur sur l'entrée N ne bloque pas N+1, N+2... Le
 *   résultat global recense chaque entrée (pushed/failed). L'usage systématique
 *   d'`upsert` neutralise les violations d'ordre causal côté serveur (un
 *   `update` qui passe avant son `insert` créera la ligne ; FK constraint
 *   échouera et sera rejouée au cycle suivant).
 *
 * Hors scope :
 * - Reconnexion automatique / retry timer (TA-121+).
 * - Pull depuis Supabase.
 * - Résolution de conflits (last-write-wins par updated_at — Phase 6 ultérieure).
 */
export function createSyncService({ supabase }: SyncServiceDeps): {
  getUnsynced: (db: SQLiteDatabase) => Promise<SyncQueueRecord[]>;
  push: (db: SQLiteDatabase) => Promise<PushResult>;
} {
  async function getUnsynced(db: SQLiteDatabase): Promise<SyncQueueRecord[]> {
    return getPendingSyncRecords(db);
  }

  async function push(db: SQLiteDatabase): Promise<PushResult> {
    // Snapshot de la queue au début du push. Toute entrée enfilée pendant
    // l'exécution sera traitée au prochain appel — ça borne la durée du push
    // et évite les boucles infinies si un caller enqueue en parallèle.
    const pending = await getPendingSyncRecords(db);
    if (pending.length === 0) {
      return { pushed: 0, failed: 0, results: [] };
    }

    const results: PushEntryOutcome[] = [];

    for (const entry of pending) {
      const outcome = await pushEntry(db, supabase, entry);
      results.push(outcome);
    }

    const pushed = results.filter((r) => r.status === 'pushed').length;
    const failed = results.length - pushed;
    return { pushed, failed, results };
  }

  return { getUnsynced, push };
}

/**
 * Traite une entrée individuelle. Toutes les erreurs sont capturées et
 * converties en `PushEntryOutcome.failed` — `pushEntry` ne throw jamais
 * pour ne pas casser la boucle de `push()`.
 */
async function pushEntry(
  db: SQLiteDatabase,
  supabase: SupabasePushClient,
  entry: SyncQueueRecord
): Promise<PushEntryOutcome> {
  const base = {
    id: entry.id,
    tableName: entry.tableName,
    recordId: entry.recordId,
    action: entry.action,
  } as const;

  // Parse défensif : payload est une string JSON sérialisée par enqueueSyncRecord.
  // Une erreur de parse signale une corruption SQLite — on log et on skip.
  let parsedPayload: Record<string, unknown>;
  try {
    parsedPayload = JSON.parse(entry.payload) as Record<string, unknown>;
  } catch (err) {
    console.warn(
      `[sync] entry #${entry.id} (${entry.tableName}/${entry.action}) — payload JSON.parse failed`,
      err
    );
    return { ...base, status: 'failed', error: 'invalid_payload' };
  }

  // Appel réseau — toute exception (fetch fail, RLS, contrainte) → failed.
  try {
    const remoteError = await dispatchToSupabase(
      supabase,
      entry.tableName,
      entry.action,
      entry.recordId,
      parsedPayload
    );
    if (remoteError) {
      return { ...base, status: 'failed', error: remoteError };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[sync] entry #${entry.id} (${entry.tableName}/${entry.action}) — remote call threw`,
      err
    );
    return { ...base, status: 'failed', error: message };
  }

  // Mark synced en local APRÈS confirmation Supabase. Si cet UPDATE échoue
  // (DB locale corrompue/locked), on retourne quand même 'pushed' parce que
  // la donnée est passée côté serveur — la prochaine itération re-pushera
  // (idempotent grâce à upsert) sans corrompre l'état serveur.
  try {
    await markEntrySynced(db, entry);
    if (TABLES_WITH_SYNCED_AT.has(entry.tableName) && entry.action !== 'delete') {
      await stampSourceSyncedAt(db, entry.tableName, entry.recordId);
    }
  } catch (err) {
    console.warn(
      `[sync] entry #${entry.id} pushed to Supabase but local mark/stamp failed`,
      err
    );
  }

  return { ...base, status: 'pushed' };
}

/**
 * Dispatch vers le bon verbe Supabase selon l'action de la queue.
 * Retourne `null` si OK, sinon le message d'erreur Supabase.
 *
 * - `insert` et `update` → `upsert(onConflict: 'id')` (idempotent).
 * - `delete` → `delete().eq('id', recordId)`. La clé vient de la SyncQueue,
 *   pas du payload : `recordId` est la source de vérité (le payload pour un
 *   delete est minimal `{ id }`, cf. ADR-012).
 */
async function dispatchToSupabase(
  supabase: SupabasePushClient,
  tableName: SyncTableName,
  action: 'insert' | 'update' | 'delete',
  recordId: string,
  payload: Record<string, unknown>
): Promise<string | null> {
  const table = supabase.from(tableName);

  if (action === 'delete') {
    const { error } = await table.delete().eq('id', recordId);
    return error ? error.message : null;
  }

  // insert et update sont traités identiquement via upsert : c'est ce qui
  // nous donne l'idempotence "rejouer une op ne corrompt pas l'état" (ADR-012).
  const { error } = await table.upsert(payload, { onConflict: 'id' });
  return error ? error.message : null;
}

async function markEntrySynced(
  db: SQLiteDatabase,
  entry: SyncQueueRecord
): Promise<void> {
  await db.runAsync('UPDATE sync_queue SET synced = 1 WHERE id = ?', [entry.id]);
}

/**
 * Patch `synced_at` sur la ligne source (sessions uniquement à ce jour).
 * Le timestamp est local — Phase 6 ultérieure pourra remonter le timestamp
 * serveur réel via `RETURNING synced_at` côté Supabase.
 *
 * La SQL est constante (pas de template literal) pour éliminer tout risque
 * d'injection si une entrée corrompue passait le cast `as SyncTableName`.
 * Si d'autres tables rejoignent `TABLES_WITH_SYNCED_AT`, ajouter un case
 * explicite ici plutôt que de réintroduire la template.
 */
async function stampSourceSyncedAt(
  db: SQLiteDatabase,
  tableName: SyncTableName,
  recordId: string
): Promise<void> {
  if (tableName !== 'sessions') return;
  const now = new Date().toISOString();
  const sql = 'UPDATE sessions SET synced_at = ? WHERE id = ?';
  await db.runAsync(sql, [now, recordId]);
}
