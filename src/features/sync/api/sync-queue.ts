import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  SyncAction,
  SyncQueueRecord,
  SyncTableName,
} from '../types/sync-queue';

export async function enqueueSyncRecord(
  db: SQLiteDatabase,
  tableName: SyncTableName,
  recordId: string,
  action: SyncAction,
  payload: Record<string, unknown>
): Promise<void> {
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO sync_queue (table_name, record_id, action, payload, created_at, synced)
     VALUES (?, ?, ?, ?, ?, 0)`,
    [tableName, recordId, action, JSON.stringify(payload), now]
  );
}

// Note: SyncQueueRecord.payload is a raw JSON string as stored in SQLite.
// The sync engine is responsible for parsing it (JSON.parse) before use.
export async function getPendingSyncRecords(
  db: SQLiteDatabase
): Promise<SyncQueueRecord[]> {
  type Row = {
    id: number;
    table_name: string;
    record_id: string;
    action: string;
    payload: string;
    created_at: string;
    synced: number;
  };
  const rows = await db.getAllAsync<Row>(
    'SELECT * FROM sync_queue WHERE synced = 0 ORDER BY created_at ASC'
  );
  return rows.map((row) => ({
    id: row.id,
    tableName: row.table_name as SyncTableName,
    recordId: row.record_id,
    action: row.action as SyncAction,
    payload: row.payload,
    createdAt: row.created_at,
    synced: row.synced === 1,
  }));
}
