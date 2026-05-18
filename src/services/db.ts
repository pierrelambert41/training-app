import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from '../db/migrations/db-migrations';

const DB_NAME = 'training.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result?.user_version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion);
  if (pending.length === 0) return;

  for (const migration of pending) {
    try {
      await db.execAsync('BEGIN TRANSACTION');
      await db.execAsync(migration.sql);
      await db.execAsync('COMMIT');
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    } catch (e) {
      await db.execAsync('ROLLBACK');
      throw e;
    }
  }
}

export async function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync('PRAGMA foreign_keys = ON');
  await runMigrations(db);
  dbInstance = db;
  return db;
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error(
      'Database not initialized. Call openDatabase() before getDatabase().'
    );
  }
  return dbInstance;
}

export function resetDatabaseInstance(): void {
  dbInstance = null;
}
