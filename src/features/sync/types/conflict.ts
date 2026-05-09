import type { SyncTableName } from './sync-queue';

/**
 * Tables soumises à la résolution de conflits last-write-wins (TA-122).
 *
 * - `sessions` et `set_logs` : ont une colonne `updated_at` (locale + Supabase).
 * - `recommendations` : pas d'`updated_at` ni en local ni en remote (la table
 *   est append-only via ADR-020 : clear + recreate à chaque run du moteur).
 *   On utilise `created_at` comme timestamp de comparaison — fallback
 *   conservateur, en pratique la collision sur `id` est virtuellement
 *   impossible puisque les UUIDs sont régénérés à chaque rerun.
 *
 * Ne pas étendre cette liste sans (a) une colonne timestamp côté SQLite ET
 * Supabase, (b) un mapping snake_case→camelCase géré dans
 * `copy-remote-row-to-local.ts`.
 */
export type ConflictCheckedTable = Extract<
  SyncTableName,
  'sessions' | 'set_logs' | 'recommendations'
>;

/**
 * Issue d'une comparaison de timestamps remote vs local.
 *
 * - `local`  : timestamp local strictement plus récent ou égal — upsert normal.
 * - `remote` : timestamp remote strictement plus récent — skip push, copie
 *              remote en local, mark synced=1.
 * - `no_remote` : pas de ligne côté remote — upsert normal (création).
 */
export type ConflictWinner = 'local' | 'remote' | 'no_remote';

/**
 * Trace d'un conflit résolu pendant un push(). Accumulé in-memory dans le
 * service via `getConflictLogs()`. Pas persisté en DB (debug uniquement).
 *
 * `winner: 'local' | 'remote'` — un `no_remote` n'est PAS un conflit, il
 * n'est jamais loggé. Le log mémorise les deux timestamps pour faciliter
 * le diagnostic post-mortem (ex: skew d'horloge entre devices).
 */
export type ConflictResolutionLog = {
  table: ConflictCheckedTable;
  recordId: string;
  winner: 'local' | 'remote';
  localTimestamp: string;
  remoteTimestamp: string;
  resolvedAt: string;
};
