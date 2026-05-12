import type { SQLiteDatabase } from 'expo-sqlite';
import {
  computeBestE1rm,
  computeRecentAvgLoad,
  type SetSample,
} from '../domain/calibration';

export type ExerciseCalibration = {
  exerciseId: string;
  e1rm: number;
  recentAvgLoad: number;
};

export type CalibrationResult = {
  calibrated: number;
  exercises: ExerciseCalibration[];
};

type SetLogRow = {
  exercise_id: string;
  load: number | null;
  reps: number | null;
  session_date: string;
};

type PlannedExerciseRow = {
  id: string;
  exercise_id: string;
  progression_config: string;
};

/**
 * Calcule les baselines (e1RM + charge récente) pour chaque exercice ayant
 * des SetLogs appartenant à l'utilisateur.
 *
 * Effets de bord SQLite :
 * 1. Upsert dans `exercise_baselines` (données dérivées — pas dans SyncQueue).
 * 2. Si un programme actif existe, met à jour `initial_load` dans le
 *    `progression_config` des PlannedExercise correspondants.
 */
export async function calibrateExerciseBaselines(
  db: SQLiteDatabase,
  userId: string
): Promise<CalibrationResult> {
  const rows = await db.getAllAsync<SetLogRow>(
    `SELECT sl.exercise_id, sl.load, sl.reps, s.date AS session_date
       FROM set_logs sl
       JOIN sessions s ON s.id = sl.session_id
      WHERE s.user_id = ?
        AND sl.load IS NOT NULL
        AND sl.reps IS NOT NULL
        AND sl.completed = 1`,
    [userId]
  );

  const byExercise = groupByExercise(rows);
  const now = new Date().toISOString();
  const calibrations: ExerciseCalibration[] = [];

  for (const [exerciseId, sets] of Object.entries(byExercise)) {
    const bestE1rm = computeBestE1rm(sets);
    const recentAvgLoad = computeRecentAvgLoad(sets);

    if (bestE1rm === null || recentAvgLoad === null) continue;

    await db.runAsync(
      `INSERT INTO exercise_baselines (exercise_id, user_id, best_e1rm, recent_avg_load, calibrated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(exercise_id) DO UPDATE SET
         best_e1rm = excluded.best_e1rm,
         recent_avg_load = excluded.recent_avg_load,
         calibrated_at = excluded.calibrated_at`,
      [exerciseId, userId, bestE1rm, recentAvgLoad, now]
    );

    calibrations.push({ exerciseId, e1rm: bestE1rm, recentAvgLoad });
  }

  if (calibrations.length > 0) {
    await applyToActiveProgramPlannedExercises(db, userId, calibrations);
  }

  return { calibrated: calibrations.length, exercises: calibrations };
}

type SetWithDate = SetSample & { sessionDateIso: string };

function groupByExercise(rows: SetLogRow[]): Record<string, SetWithDate[]> {
  const map: Record<string, SetWithDate[]> = {};
  for (const row of rows) {
    if (row.load === null || row.reps === null) continue;
    const existing = map[row.exercise_id] ?? [];
    existing.push({ load: row.load, reps: row.reps, sessionDateIso: row.session_date });
    map[row.exercise_id] = existing;
  }
  return map;
}

async function applyToActiveProgramPlannedExercises(
  db: SQLiteDatabase,
  userId: string,
  calibrations: ExerciseCalibration[]
): Promise<void> {
  const activeProgram = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM programs WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (!activeProgram) return;

  const plannedExercises = await db.getAllAsync<PlannedExerciseRow>(
    `SELECT pe.id, pe.exercise_id, pe.progression_config
       FROM planned_exercises pe
       JOIN workout_days wd ON wd.id = pe.workout_day_id
       JOIN blocks b ON b.id = wd.block_id
      WHERE b.program_id = ?`,
    [activeProgram.id]
  );

  const calibrationMap = new Map<string, ExerciseCalibration>(
    calibrations.map((c) => [c.exerciseId, c])
  );

  for (const pe of plannedExercises) {
    const calibration = calibrationMap.get(pe.exercise_id);
    if (!calibration) continue;

    const existingConfig = parseConfig(pe.progression_config);
    const updatedConfig = {
      ...existingConfig,
      initial_load: calibration.recentAvgLoad,
    };

    await db.runAsync(
      `UPDATE planned_exercises SET progression_config = ? WHERE id = ?`,
      [JSON.stringify(updatedConfig), pe.id]
    );
  }
}

function parseConfig(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}
