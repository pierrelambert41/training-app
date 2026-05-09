import type { ConflictResolutionLog } from './conflict';
import type { SyncAction, SyncTableName } from './sync-queue';

/**
 * Builder de query Supabase utilisé par la sync push.
 *
 * Trois familles de méthodes :
 * - `upsert` : pour insert/update (idempotent, cf. ADR-022).
 * - `delete().eq(...)` : pour delete (clé fournie par la SyncQueue).
 * - `select(...).eq(...).maybeSingle()` : pour lire le timestamp remote
 *   avant un upsert quand la résolution de conflits est active (TA-122).
 *
 * On garde une interface minimale plutôt qu'importer `SupabaseClient` typé :
 * 1) éviter de couvrir tout le type Database, 2) faciliter le mock de tests.
 */
export type SupabasePushBuilder = {
  upsert: (
    payload: Record<string, unknown>,
    options?: { onConflict?: string }
  ) => Promise<{ error: { message: string } | null }>;
  delete: () => {
    eq: (
      column: string,
      value: string
    ) => Promise<{ error: { message: string } | null }>;
  };
  /**
   * Sélection d'une ligne par id pour le check de conflit. Ressemble à
   * l'API Supabase : `.select(cols).eq('id', value).maybeSingle()`.
   *
   * `maybeSingle` retourne `data: null` (pas une erreur) si la ligne
   * n'existe pas. Tout autre échec (réseau, RLS) → `error.message`.
   */
  select: (columns: string) => {
    eq: (
      column: string,
      value: string
    ) => {
      maybeSingle: () => Promise<{
        data: Record<string, unknown> | null;
        error: { message: string } | null;
      }>;
    };
  };
};

export type SupabasePushClient = {
  from: (table: string) => SupabasePushBuilder;
};

/**
 * Résultat d'une entrée individuelle traitée pendant `push()`.
 *
 * `status: 'pushed'` peut signifier deux choses :
 * - upsert/delete réussi côté Supabase (cas nominal).
 * - conflit résolu en faveur du remote : on a copié remote en local et
 *   marqué synced=1 sans faire d'upsert. Distingué via `conflictResolved`.
 *
 * `status: 'failed'` : erreur réseau/Supabase OU payload corrompu OU
 * échec lors du fetch du remote pour le check de conflit. L'entrée reste
 * `synced=0` et sera rejouée au prochain `push()`.
 */
export type PushEntryOutcome =
  | {
      id: number;
      tableName: SyncTableName;
      recordId: string;
      action: SyncAction;
      status: 'pushed';
      conflictResolved?: 'local' | 'remote';
    }
  | {
      id: number;
      tableName: SyncTableName;
      recordId: string;
      action: SyncAction;
      status: 'failed';
      error: string;
    };

/**
 * Récap d'une exécution complète de `push()`. `pushed + failed = total`.
 * Une queue vide → `{ pushed: 0, failed: 0, results: [] }` (no-op, pas
 * d'appel réseau).
 *
 * `conflicts` est l'agrégat des résolutions de conflits effectuées pendant
 * ce push (winner: 'local' | 'remote' uniquement — un `no_remote` n'est
 * pas un conflit, il n'apparaît pas ici). Cf. `getConflictLogs()` pour
 * le cumul historique du service.
 */
export type PushResult = {
  pushed: number;
  failed: number;
  results: PushEntryOutcome[];
  conflicts: ConflictResolutionLog[];
};
