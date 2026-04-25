import type { SQLiteDatabase } from 'expo-sqlite';
import {
  enqueueSyncRecord,
  type SyncAction,
  type SyncTableName,
} from './sync-queue';

/**
 * Enqueue safe : un échec n'interrompt JAMAIS l'écriture locale qui le précède
 * (cf. ADR-012). Le sync engine (Phase 6) rejouera l'opération à partir
 * de l'état local — la SyncQueue reste une optimisation, pas la source
 * de vérité.
 */
export async function safeEnqueue(
  db: SQLiteDatabase,
  table: SyncTableName,
  recordId: string,
  action: SyncAction,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    await enqueueSyncRecord(db, table, recordId, action, payload);
  } catch (err) {
    console.warn(
      `[${table}] enqueueSyncRecord failed (${action}) — local write preserved, sync will retry`,
      err
    );
  }
}
