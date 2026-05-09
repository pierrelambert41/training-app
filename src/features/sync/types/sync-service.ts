import type { SyncAction, SyncTableName } from './sync-queue';

/**
 * Interface minimale pour un client Supabase, suffisante pour la sync push.
 * Permet l'injection de dépendance dans `createSyncService` (tests sans réseau,
 * future migration vers un autre backend, etc.).
 *
 * On n'importe pas `SupabaseClient` directement : 1) éviter de couvrir tout le
 * type Database, 2) faciliter le mock de tests sans mocker tout le module.
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
};

export type SupabasePushClient = {
  from: (table: string) => SupabasePushBuilder;
};

/**
 * Résultat d'une entrée individuelle traitée pendant `push()`.
 * - `status: 'pushed'` → upsert/delete OK + flag local synced=1.
 * - `status: 'failed'` → erreur réseau/Supabase OU payload corrompu.
 *   L'entrée reste `synced=0` et sera rejouée au prochain `push()`.
 */
export type PushEntryOutcome =
  | {
      id: number;
      tableName: SyncTableName;
      recordId: string;
      action: SyncAction;
      status: 'pushed';
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
 */
export type PushResult = {
  pushed: number;
  failed: number;
  results: PushEntryOutcome[];
};
