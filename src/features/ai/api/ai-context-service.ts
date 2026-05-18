import type { SQLiteDatabase } from 'expo-sqlite';
import { safeEnqueue } from '@/features/sync';
import { generateUUID } from '@/utils/uuid';
import {
  buildAIContextProfile,
  type BuildAIContextProfileInputs,
  type ExerciseBaselineSnapshot,
  type RecoveryLogSnapshot,
  type SetLogSnapshot,
  type UserProfileSnapshot,
  type CurrentBlockSnapshot,
} from '../domain/build-ai-context-profile';
import type { AIContextProfile } from '../types/ai-context';

/**
 * Row SQLite de la table ai_context_profiles.
 */
type AIContextProfileRow = {
  id: string;
  user_id: string;
  profile_json: string;
  version: number;
  updated_at: string;
};

type UserProfileRow = {
  training_level: string | null;
  goals: string | null;
  height_cm: number | null;
  preferred_unit: string | null;
  sports_parallel: string | null;
  constraints: string | null;
};

type BlockRow = {
  title: string;
  goal: string;
  week_number: number;
  duration_weeks: number;
};

type SetLogRow = {
  exercise_id: string;
  exercise_name: string;
  load: number | null;
  reps: number | null;
  session_date: string;
};

type ExerciseBaselineRow = {
  exercise_id: string;
  exercise_name: string;
  best_e1rm: number;
  recent_avg_load: number;
  calibrated_at: string;
};

type RecoveryLogRow = {
  date: string;
  sleep_hours: number | null;
  energy: number | null;
  soreness: number | null;
};

type SessionCountRow = {
  total: number;
  completed: number;
};

/**
 * Lit le profil IA local depuis SQLite.
 * Retourne null si aucun profil n'existe encore.
 */
export async function getAIContextProfile(
  db: SQLiteDatabase,
  userId: string
): Promise<AIContextProfile | null> {
  const row = await db.getFirstAsync<AIContextProfileRow>(
    'SELECT * FROM ai_context_profiles WHERE user_id = ?',
    [userId]
  );

  if (!row) return null;

  try {
    return JSON.parse(row.profile_json) as AIContextProfile;
  } catch {
    return null;
  }
}

/**
 * Recalcule le profil IA à partir des données SQLite courantes, persiste le
 * résultat via INSERT OR REPLACE et enqueue vers Supabase.
 *
 * Idempotent : rejouer 2x → 1 seul row, version incrémentée à chaque appel.
 * Cf. ADR-027 pour la stratégie de persistance.
 */
export async function refreshAIContextProfile(
  db: SQLiteDatabase,
  userId: string
): Promise<AIContextProfile> {
  const existing = await db.getFirstAsync<Pick<AIContextProfileRow, 'id' | 'version'>>(
    'SELECT id, version FROM ai_context_profiles WHERE user_id = ?',
    [userId]
  );

  const profileId = existing?.id ?? generateUUID();
  const previousVersion = existing?.version ?? 0;

  const inputs = await readBuildInputs(db, userId, previousVersion);
  const profile = buildAIContextProfile(inputs);

  const updatedAt = new Date().toISOString();
  const profileJson = JSON.stringify(profile);

  await db.runAsync(
    `INSERT OR REPLACE INTO ai_context_profiles (id, user_id, profile_json, version, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [profileId, userId, profileJson, profile.version, updatedAt]
  );

  await safeEnqueue(db, 'ai_context_profiles', profileId, existing ? 'update' : 'insert', {
    id: profileId,
    user_id: userId,
    profile_json: profileJson,
    version: profile.version,
    updated_at: updatedAt,
  });

  return profile;
}

async function readBuildInputs(
  db: SQLiteDatabase,
  userId: string,
  previousVersion: number
): Promise<BuildAIContextProfileInputs> {
  const userProfile = await readUserProfile(db, userId);
  const currentBlock = await readCurrentBlock(db, userId);
  const exerciseBaselines = await readExerciseBaselines(db, userId);
  const recentSetLogs = await readRecentSetLogs(db, userId);
  const recoveryLogs = await readRecoveryLogs(db, userId);

  return {
    userId,
    userProfile,
    currentBlock: currentBlock ?? undefined,
    exerciseBaselines,
    recentSetLogs,
    recoveryLogs,
    previousVersion,
  };
}

async function readUserProfile(
  db: SQLiteDatabase,
  userId: string
): Promise<UserProfileSnapshot> {
  const row = await db.getFirstAsync<UserProfileRow>(
    `SELECT training_level, goals, height_cm, preferred_unit, sports_parallel, constraints
     FROM user_profiles WHERE user_id = ?`,
    [userId]
  );

  let goals: { primary: string; secondary?: string } = { primary: 'hypertrophy' };
  if (row?.goals) {
    try {
      goals = JSON.parse(row.goals) as typeof goals;
    } catch {
      // dégradation gracieuse
    }
  }

  let parallelSports: string[] = [];
  if (row?.sports_parallel) {
    try {
      parallelSports = JSON.parse(row.sports_parallel) as string[];
    } catch {
      // dégradation gracieuse
    }
  }

  let constraints: string[] = [];
  if (row?.constraints) {
    try {
      const parsed = JSON.parse(row.constraints) as Record<string, unknown>;
      if (Array.isArray(parsed)) {
        constraints = parsed as string[];
      } else if (Array.isArray(parsed?.injuries)) {
        constraints = parsed.injuries as string[];
      }
    } catch {
      // dégradation gracieuse
    }
  }

  const levelMap: Record<string, UserProfileSnapshot['level']> = {
    beginner: 'beginner',
    intermediate: 'intermediate',
    advanced: 'advanced',
  };

  return {
    level: levelMap[row?.training_level ?? ''] ?? 'intermediate',
    goals,
    trainingFrequency: 3,
    heightCm: row?.height_cm ?? undefined,
    preferredUnit:
      row?.preferred_unit === 'lb' ? 'lb' : 'kg',
    parallelSports,
    constraints,
  };
}

async function readCurrentBlock(
  db: SQLiteDatabase,
  userId: string
): Promise<CurrentBlockSnapshot | null> {
  const block = await db.getFirstAsync<BlockRow>(
    `SELECT b.title, b.goal, b.week_number, b.duration_weeks
     FROM blocks b
     JOIN programs p ON p.id = b.program_id
     WHERE p.user_id = ? AND p.is_active = 1 AND b.status IN ('active', 'deloaded')
     ORDER BY b.start_date DESC
     LIMIT 1`,
    [userId]
  );

  if (!block) return null;

  const counts = await db.getFirstAsync<SessionCountRow>(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN s.status = 'completed' THEN 1 ELSE 0 END) AS completed
     FROM sessions s
     WHERE s.user_id = ?
       AND s.block_id IN (
         SELECT b.id FROM blocks b
         JOIN programs p ON p.id = b.program_id
         WHERE p.user_id = ? AND p.is_active = 1 AND b.status IN ('active', 'deloaded')
       )`,
    [userId, userId]
  );

  return {
    title: block.title,
    goal: block.goal,
    weekNumber: block.week_number,
    durationWeeks: block.duration_weeks,
    totalSessions: counts?.total ?? 0,
    completedSessions: counts?.completed ?? 0,
  };
}

async function readExerciseBaselines(
  db: SQLiteDatabase,
  userId: string
): Promise<ExerciseBaselineSnapshot[]> {
  const rows = await db.getAllAsync<ExerciseBaselineRow>(
    `SELECT eb.exercise_id, e.name AS exercise_name,
            eb.best_e1rm, eb.recent_avg_load, eb.calibrated_at
     FROM exercise_baselines eb
     JOIN exercises e ON e.id = eb.exercise_id
     WHERE eb.user_id = ?`,
    [userId]
  );

  return rows.map((r) => ({
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    bestE1rm: r.best_e1rm,
    recentAvgLoad: r.recent_avg_load,
    calibratedAt: r.calibrated_at,
  }));
}

async function readRecentSetLogs(
  db: SQLiteDatabase,
  userId: string
): Promise<SetLogSnapshot[]> {
  const cutoff = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const rows = await db.getAllAsync<SetLogRow>(
    `SELECT sl.exercise_id, e.name AS exercise_name,
            sl.load, sl.reps, s.date AS session_date
     FROM set_logs sl
     JOIN sessions s ON s.id = sl.session_id
     JOIN exercises e ON e.id = sl.exercise_id
     WHERE s.user_id = ?
       AND sl.completed = 1
       AND sl.load IS NOT NULL
       AND sl.reps IS NOT NULL
       AND s.date >= ?
     ORDER BY s.date ASC`,
    [userId, cutoff]
  );

  return rows.map((r) => ({
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name,
    load: r.load,
    reps: r.reps,
    sessionDate: r.session_date,
  }));
}

async function readRecoveryLogs(
  db: SQLiteDatabase,
  userId: string
): Promise<RecoveryLogSnapshot[]> {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  let rows: RecoveryLogRow[] = [];
  try {
    rows = await db.getAllAsync<RecoveryLogRow>(
      `SELECT date, sleep_hours, energy, soreness
       FROM recovery_logs
       WHERE user_id = ? AND date >= ?
       ORDER BY date DESC`,
      [userId, cutoff]
    );
  } catch {
    // Dégradation gracieuse : table peut ne pas avoir de données (Phase 4 saisie absente).
    // Cf. pitfall PROG-02.
  }

  return rows.map((r) => ({
    date: r.date,
    sleepHours: r.sleep_hours,
    energy: r.energy,
    soreness: r.soreness,
  }));
}
