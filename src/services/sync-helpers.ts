import type { SQLiteDatabase } from 'expo-sqlite';
import { enqueueSyncRecord } from './sync-queue';

export async function safeEnqueue(
  db: SQLiteDatabase,
  table: string,
  recordId: string,
  action: 'insert' | 'update' | 'delete',
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
