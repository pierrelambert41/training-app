import * as SQLite from 'expo-sqlite';
import { EXERCISES_SEED_SQL } from '../db/migrations/seed-exercises';

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
        -- workout_day_id is NOT NULL but has a FK to workout_days(id).
        -- For unplanned exercises added during a free session (session.workoutDayId IS NULL),
        -- live.tsx uses a synthetic id ("free-<sessionId>") that references no real workout_day row.
        -- SQLite does NOT enforce FK constraints by default (PRAGMA foreign_keys = OFF),
        -- so this succeeds at runtime. If FK enforcement is ever enabled, free-session
        -- unplanned exercises must be handled differently (e.g. nullable workout_day_id).
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
  {
    version: 2,
    sql: EXERCISES_SEED_SQL,
  },
  {
    version: 3,
    sql: `
      CREATE TABLE IF NOT EXISTS exercise_favorites (
        exercise_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (exercise_id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );
    `,
  },
  {
    version: 4,
    sql: `
      CREATE INDEX IF NOT EXISTS idx_programs_user_is_active ON programs(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_blocks_program_status ON blocks(program_id, status);
      CREATE INDEX IF NOT EXISTS idx_workout_days_block_day_order ON workout_days(block_id, day_order);
      CREATE INDEX IF NOT EXISTS idx_planned_exercises_workout_day_order ON planned_exercises(workout_day_id, exercise_order);
    `,
  },
  // TA-72 — Phase 4 : indexes Session/SetLog manquants + table app_meta
  // pour stocker le device_id local (utilisé à la création de Session).
  // Les tables sessions, set_logs et sync_queue existent déjà depuis v1.
  {
    version: 5,
    sql: `
      CREATE INDEX IF NOT EXISTS idx_sessions_workout_day ON sessions(workout_day_id);
      CREATE INDEX IF NOT EXISTS idx_set_logs_planned_exercise ON set_logs(planned_exercise_id);

      CREATE TABLE IF NOT EXISTS app_meta (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
  // TA-72 — Phase 4 (review) : ajout des CHECK constraints manquantes sur
  // sessions.status et set_logs.side. SQLite ne supporte pas ALTER TABLE ADD
  // CONSTRAINT, on recrée les tables via rename → create → copy → drop.
  {
    version: 6,
    sql: `
      ALTER TABLE sessions RENAME TO sessions_v5;

      CREATE TABLE sessions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL,
        workout_day_id TEXT,
        block_id TEXT,
        date TEXT NOT NULL,
        started_at TEXT,
        ended_at TEXT,
        status TEXT NOT NULL DEFAULT 'in_progress'
          CHECK (status IN ('in_progress', 'completed', 'abandoned')),
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

      INSERT INTO sessions SELECT * FROM sessions_v5;
      DROP TABLE sessions_v5;

      ALTER TABLE set_logs RENAME TO set_logs_v5;

      CREATE TABLE set_logs (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        exercise_id TEXT NOT NULL,
        planned_exercise_id TEXT,
        set_number INTEGER NOT NULL CHECK (set_number > 0),
        target_load REAL,
        target_reps INTEGER,
        target_rir INTEGER,
        load REAL,
        reps INTEGER,
        rir INTEGER,
        duration_seconds INTEGER,
        distance_meters REAL,
        completed INTEGER NOT NULL DEFAULT 1,
        side TEXT CHECK (side IN ('left', 'right')),
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id),
        FOREIGN KEY (planned_exercise_id) REFERENCES planned_exercises(id)
      );

      INSERT INTO set_logs SELECT * FROM set_logs_v5;
      DROP TABLE set_logs_v5;

      CREATE INDEX IF NOT EXISTS idx_sessions_user_date ON sessions(user_id, date);
      CREATE INDEX IF NOT EXISTS idx_sessions_workout_day ON sessions(workout_day_id);
      CREATE INDEX IF NOT EXISTS idx_set_logs_session ON set_logs(session_id);
      CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_id);
      CREATE INDEX IF NOT EXISTS idx_set_logs_planned_exercise ON set_logs(planned_exercise_id);
    `,
  },
  // TA-80 — Ajout exercice non-prévu en séance : colonne is_unplanned pour
  // distinguer les PlannedExercise virtuels insérés à la volée pendant une
  // séance des exercices planifiés dans le programme d'origine.
  // ALTER TABLE ADD COLUMN est safe sur SQLite : additive, valeur DEFAULT 0
  // pour toutes les lignes existantes.
  {
    version: 7,
    sql: `
      ALTER TABLE planned_exercises ADD COLUMN is_unplanned INTEGER NOT NULL DEFAULT 0;
    `,
  },
  // TA-103 — Phase 5 : table recommendations (moteur de progression).
  // Table définie dans 20260423000000_initial_schema.sql côté Supabase.
  // La migration 20260429000000_recommendations_indexes.sql ajoute 2 indexes additionnels côté remote.
  // metadata stocké en TEXT (JSON sérialisé) car SQLite ne supporte pas JSONB.
  // exercise_id nullable : permet les recommandations de niveau séance (deload global).
  {
    version: 8,
    sql: `
      CREATE TABLE IF NOT EXISTS recommendations (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL,
        exercise_id TEXT,
        source TEXT NOT NULL CHECK (source IN ('rules_engine', 'ai')),
        type TEXT NOT NULL CHECK (type IN ('load_change', 'deload', 'plateau', 'fatigue_alert', 'summary')),
        message TEXT NOT NULL,
        next_load REAL,
        next_rep_target INTEGER,
        next_rir_target INTEGER,
        action TEXT CHECK (action IN ('increase', 'maintain', 'decrease', 'deload', 'replace')),
        confidence REAL,
        metadata TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id)
      );

      CREATE INDEX IF NOT EXISTS idx_recommendations_session ON recommendations(session_id);
      CREATE INDEX IF NOT EXISTS idx_recommendations_exercise ON recommendations(exercise_id);
      CREATE INDEX IF NOT EXISTS idx_recommendations_type ON recommendations(type);
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
