import * as SQLite from 'expo-sqlite';

const DB_NAME = 'training.db';

const MIGRATIONS: Array<{ version: number; sql: string }> = [
  {
    version: 1,
    sql: `
      CREATE TABLE IF NOT EXISTS exercises (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        name_fr TEXT,
        category TEXT NOT NULL,
        movement_pattern TEXT NOT NULL,
        primary_muscles TEXT NOT NULL,
        secondary_muscles TEXT NOT NULL,
        equipment TEXT NOT NULL,
        log_type TEXT NOT NULL,
        is_unilateral INTEGER NOT NULL DEFAULT 0,
        systemic_fatigue TEXT NOT NULL DEFAULT 'moderate',
        movement_stability TEXT NOT NULL DEFAULT 'stable',
        morpho_tags TEXT NOT NULL DEFAULT '[]',
        recommended_progression_type TEXT,
        alternatives TEXT NOT NULL DEFAULT '[]',
        coaching_notes TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        is_custom INTEGER NOT NULL DEFAULT 0,
        created_by TEXT,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS programs (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        goal TEXT NOT NULL,
        frequency INTEGER,
        level TEXT,
        is_active INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS blocks (
        id TEXT PRIMARY KEY NOT NULL,
        program_id TEXT NOT NULL,
        title TEXT NOT NULL,
        goal TEXT NOT NULL,
        duration_weeks INTEGER NOT NULL,
        week_number INTEGER NOT NULL DEFAULT 1,
        start_date TEXT,
        end_date TEXT,
        status TEXT NOT NULL DEFAULT 'planned',
        deload_strategy TEXT NOT NULL DEFAULT 'fatigue_triggered',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (program_id) REFERENCES programs(id)
      );

      CREATE TABLE IF NOT EXISTS workout_days (
        id TEXT PRIMARY KEY NOT NULL,
        block_id TEXT NOT NULL,
        title TEXT NOT NULL,
        day_order INTEGER NOT NULL,
        split_type TEXT,
        estimated_duration_min INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (block_id) REFERENCES blocks(id)
      );

      CREATE TABLE IF NOT EXISTS planned_exercises (
        id TEXT PRIMARY KEY NOT NULL,
        workout_day_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        exercise_order INTEGER NOT NULL,
        role TEXT NOT NULL,
        sets INTEGER NOT NULL,
        rep_range_min INTEGER NOT NULL,
        rep_range_max INTEGER NOT NULL,
        target_rir INTEGER,
        rest_seconds INTEGER,
        tempo TEXT,
        progression_type TEXT NOT NULL,
        progression_config TEXT NOT NULL,
        notes TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (workout_day_id) REFERENCES workout_days(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        workout_day_id TEXT,
        block_id TEXT,
        date TEXT NOT NULL,
        started_at TEXT,
        ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'in_progress',
        readiness INTEGER,
        energy INTEGER,
        motivation INTEGER,
        sleep_quality INTEGER,
        pre_session_notes TEXT,
        completion_score REAL,
        performance_score REAL,
        fatigue_score REAL,
        post_session_notes TEXT,
        device_id TEXT,
        synced_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS set_logs (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        planned_exercise_id TEXT,
        set_number INTEGER NOT NULL,
        target_load REAL,
        target_reps INTEGER,
        target_rir INTEGER,
        load REAL,
        reps INTEGER,
        rir INTEGER,
        duration_seconds INTEGER,
        distance_meters REAL,
        completed INTEGER NOT NULL DEFAULT 1,
        side TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id),
        FOREIGN KEY (planned_exercise_id) REFERENCES planned_exercises(id)
      );

      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        action TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        synced INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_id);
      CREATE INDEX IF NOT EXISTS idx_blocks_program ON blocks(program_id);
      CREATE INDEX IF NOT EXISTS idx_workout_days_block ON workout_days(block_id);
      CREATE INDEX IF NOT EXISTS idx_planned_exercises_workout_day ON planned_exercises(workout_day_id);
    `,
  },
];

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
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
      await db.execAsync('COMMIT');
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
