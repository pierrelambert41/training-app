import type { SQLiteDatabase } from 'expo-sqlite';
import type { ConflictResolutionLog } from '../types/conflict';
import type { SyncQueueRecord, SyncTableName } from '../types/sync-queue';
import type {
  PushEntryOutcome,
  PushResult,
  SupabasePushClient,
} from '../types/sync-service';
import { type ConflictLogStore, createConflictLogStore } from './conflict-log-store';
import { isConflictCheckedTable, runConflictCheck } from './conflict-check';
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
  /**
   * Permet d'injecter un store partagé (ex: tests, observabilité). Si non
   * fourni, le service en crée un en interne.
   */
  conflictLogStore?: ConflictLogStore;
};

/**
 * Service de synchronisation push : SQLite → Supabase.
 *
 * Responsabilités :
 * - `getUnsynced(db)` : retourne les entrées `sync_queue` avec `synced=0`,
 *   ordonnées causalement (created_at ASC).
 * - `push(db)` : envoie chaque entrée vers Supabase (upsert pour insert/update,
 *   delete pour delete). Avant chaque upsert sur une table conflict-checked,
 *   fetch le timestamp remote, applique LWW (TA-122), log les conflits.
 * - `getConflictLogs()` : retourne les logs cumulés depuis l'instanciation
 *   du service. Utile pour debug ou observabilité.
 *
 * Garanties (cf. ADR-022 + ADR-024) :
 * - **Idempotence** : `upsert(onConflict: 'id')` pour insert/update, `delete`
 *   silencieux si absent. Rejouer une op ne corrompt pas l'état serveur.
 * - **Pas de perte** : une entrée n'est marquée `synced=1` qu'après
 *   confirmation Supabase OU qu'après copy remote→local réussi (cas remote
 *   gagne). Erreur réseau → l'entrée reste en queue et sera rejouée.
 * - **Non fail-fast** : une erreur sur l'entrée N ne bloque pas N+1.
 * - **Last-write-wins** : pour sessions/set_logs/recommendations, on
 *   compare `updated_at` (ou `created_at` pour recommendations) avant
 *   chaque upsert. Le timestamp le plus récent gagne ; un conflit résolu
 *   produit un `ConflictResolutionLog`.
 *
 * Hors scope :
 * - Pull descendant automatique (sync engine bidirectionnel).
 * - UI de résolution manuelle de conflits.
 * - Merge trois-voies (last-write-wins suffit pour Phase 6).
 */
export function createSyncService({
  supabase,
  conflictLogStore,
}: SyncServiceDeps): {
  getUnsynced: (db: SQLiteDatabase) => Promise<SyncQueueRecord[]>;
  push: (db: SQLiteDatabase) => Promise<PushResult>;
  getConflictLogs: () => ConflictResolutionLog[];
} {
  const logStore = conflictLogStore ?? createConflictLogStore();

  async function getUnsynced(db: SQLiteDatabase): Promise<SyncQueueRecord[]> {
    return getPendingSyncRecords(db);
  }

  async function push(db: SQLiteDatabase): Promise<PushResult> {
    // Snapshot de la queue au début du push. Toute entrée enfilée pendant
    // l'exécution sera traitée au prochain appel — ça borne la durée du push
    // et évite les boucles infinies si un caller enqueue en parallèle.
    const pending = await getPendingSyncRecords(db);
    if (pending.length === 0) {
      return { pushed: 0, failed: 0, results: [], conflicts: [] };
    }

    const results: PushEntryOutcome[] = [];
    const conflictsThisPush: ConflictResolutionLog[] = [];

    for (const entry of pending) {
      const outcome = await pushEntry(db, supabase, entry, logStore, conflictsThisPush);
      results.push(outcome);
    }

    const pushed = results.filter((r) => r.status === 'pushed').length;
    const failed = results.length - pushed;
    return { pushed, failed, results, conflicts: conflictsThisPush };
  }

  function getConflictLogs(): ConflictResolutionLog[] {
    return logStore.getAll();
  }

  return { getUnsynced, push, getConflictLogs };
}

/**
 * Traite une entrée individuelle. Toutes les erreurs sont capturées et
 * converties en `PushEntryOutcome.failed` — `pushEntry` ne throw jamais
 * pour ne pas casser la boucle de `push()`.
 */
async function pushEntry(
  db: SQLiteDatabase,
  supabase: SupabasePushClient,
  entry: SyncQueueRecord,
  logStore: ConflictLogStore,
  conflictsThisPush: ConflictResolutionLog[]
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

  // Check de conflit AVANT upsert pour les tables concernées (TA-122).
  // Pas de check pour delete (idempotent, ligne supprimée des deux côtés).
  // Pas de check pour les tables non-listées (programs, etc.).
  let conflictWinner: 'local' | 'no_remote' = 'no_remote';
  if (entry.action !== 'delete' && isConflictCheckedTable(entry.tableName)) {
    const check = await runConflictCheck(db, supabase, entry, parsedPayload);

    if (check.kind === 'failed') {
      return { ...base, status: 'failed', error: check.error };
    }

    if (check.kind === 'remote_wins') {
      // Remote gagne : on a déjà copié remote→local et logué. On marque
      // synced=1 SANS upsert (la donnée serveur est canonique).
      conflictsThisPush.push(check.log);
      logStore.append(check.log);
      try {
        await markEntrySynced(db, entry);
      } catch (err) {
        console.warn(
          `[sync] entry #${entry.id} resolved as remote-wins but local mark failed`,
          err
        );
      }
      return { ...base, status: 'pushed', conflictResolved: 'remote' };
    }

    if (check.kind === 'local_wins') {
      conflictsThisPush.push(check.log);
      logStore.append(check.log);
      conflictWinner = 'local';
    }
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

  return conflictWinner === 'local'
    ? { ...base, status: 'pushed', conflictResolved: 'local' }
    : { ...base, status: 'pushed' };
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
