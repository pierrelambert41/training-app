import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  NewPlannedExerciseInput,
  PlannedExercise,
  ProgressionConfig,
  UpdatePlannedExerciseInput,
} from '@/types';
import { safeEnqueue } from './sync-helpers';

const TABLE = 'planned_exercises';

type PlannedExerciseRow = {
  id: string;
  workout_day_id: string;
  exercise_id: string;
  exercise_order: number;
  role: string;
  sets: number;
  rep_range_min: number;
  rep_range_max: number;
  target_rir: number | null;
  rest_seconds: number | null;
  tempo: string | null;
  progression_type: string;
  progression_config: string;
  notes: string | null;
  created_at: string;
};

function parseProgressionConfig(raw: string): ProgressionConfig {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return parsed as ProgressionConfig;
  } catch {
    return {};
  }
}

function rowToPlannedExercise(row: PlannedExerciseRow): PlannedExercise {
  return {
    id: row.id,
    workoutDayId: row.workout_day_id,
    exerciseId: row.exercise_id,
    exerciseOrder: row.exercise_order,
    role: row.role as PlannedExercise['role'],
    sets: row.sets,
    repRangeMin: row.rep_range_min,
    repRangeMax: row.rep_range_max,
    targetRir: row.target_rir,
    restSeconds: row.rest_seconds,
    tempo: row.tempo,
    progressionType: row.progression_type as PlannedExercise['progressionType'],
    progressionConfig: parseProgressionConfig(row.progression_config),
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function toSupabasePayload(pe: PlannedExercise): Record<string, unknown> {
  return {
    id: pe.id,
    workout_day_id: pe.workoutDayId,
    exercise_id: pe.exerciseId,
    exercise_order: pe.exerciseOrder,
    role: pe.role,
    sets: pe.sets,
    rep_range_min: pe.repRangeMin,
    rep_range_max: pe.repRangeMax,
    target_rir: pe.targetRir,
    rest_seconds: pe.restSeconds,
    tempo: pe.tempo,
    progression_type: pe.progressionType,
    progression_config: pe.progressionConfig,
    notes: pe.notes,
    created_at: pe.createdAt,
  };
}

function assertValidRepRange(min: number, max: number): void {
  if (min > max) {
    throw new Error(
      `Invalid rep range: min (${min}) > max (${max}). Contraint DB équivalent : rep_range_max >= rep_range_min.`
    );
  }
}

export async function insertPlannedExercise(
  db: SQLiteDatabase,
  input: NewPlannedExerciseInput
): Promise<PlannedExercise> {
  assertValidRepRange(input.repRangeMin, input.repRangeMax);
  const now = new Date().toISOString();
  const pe: PlannedExercise = {
    id: input.id,
    workoutDayId: input.workoutDayId,
    exerciseId: input.exerciseId,
    exerciseOrder: input.exerciseOrder,
    role: input.role,
    sets: input.sets,
    repRangeMin: input.repRangeMin,
    repRangeMax: input.repRangeMax,
    targetRir: input.targetRir ?? null,
    restSeconds: input.restSeconds ?? null,
    tempo: input.tempo ?? null,
    progressionType: input.progressionType,
    progressionConfig: input.progressionConfig,
    notes: input.notes ?? null,
    createdAt: now,
  };

  await db.runAsync(
    `INSERT INTO planned_exercises (
      id, workout_day_id, exercise_id, exercise_order, role,
      sets, rep_range_min, rep_range_max, target_rir, rest_seconds,
      tempo, progression_type, progression_config, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      pe.id,
      pe.workoutDayId,
      pe.exerciseId,
      pe.exerciseOrder,
      pe.role,
      pe.sets,
      pe.repRangeMin,
      pe.repRangeMax,
      pe.targetRir,
      pe.restSeconds,
      pe.tempo,
      pe.progressionType,
      JSON.stringify(pe.progressionConfig),
      pe.notes,
      pe.createdAt,
    ]
  );

  await safeEnqueue(db, TABLE, pe.id, 'insert', toSupabasePayload(pe));
  return pe;
}

export async function updatePlannedExercise(
  db: SQLiteDatabase,
  id: string,
  input: UpdatePlannedExerciseInput
): Promise<PlannedExercise | null> {
  const existing = await getPlannedExerciseById(db, id);
  if (!existing) return null;

  const repRangeMin = input.repRangeMin ?? existing.repRangeMin;
  const repRangeMax = input.repRangeMax ?? existing.repRangeMax;
  assertValidRepRange(repRangeMin, repRangeMax);

  const updated: PlannedExercise = {
    ...existing,
    exerciseOrder: input.exerciseOrder ?? existing.exerciseOrder,
    role: input.role ?? existing.role,
    sets: input.sets ?? existing.sets,
    repRangeMin,
    repRangeMax,
    targetRir:
      input.targetRir !== undefined ? input.targetRir : existing.targetRir,
    restSeconds:
      input.restSeconds !== undefined
        ? input.restSeconds
        : existing.restSeconds,
    tempo: input.tempo !== undefined ? input.tempo : existing.tempo,
    progressionType: input.progressionType ?? existing.progressionType,
    progressionConfig: input.progressionConfig ?? existing.progressionConfig,
    notes: input.notes !== undefined ? input.notes : existing.notes,
  };

  await db.runAsync(
    `UPDATE planned_exercises
       SET exercise_order = ?, role = ?, sets = ?,
           rep_range_min = ?, rep_range_max = ?,
           target_rir = ?, rest_seconds = ?, tempo = ?,
           progression_type = ?, progression_config = ?, notes = ?
     WHERE id = ?`,
    [
      updated.exerciseOrder,
      updated.role,
      updated.sets,
      updated.repRangeMin,
      updated.repRangeMax,
      updated.targetRir,
      updated.restSeconds,
      updated.tempo,
      updated.progressionType,
      JSON.stringify(updated.progressionConfig),
      updated.notes,
      updated.id,
    ]
  );

  await safeEnqueue(db, TABLE, updated.id, 'update', toSupabasePayload(updated));
  return updated;
}

export async function deletePlannedExercise(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM planned_exercises WHERE id = ?', [id]);
  await safeEnqueue(db, TABLE, id, 'delete', { id });
}

export async function getPlannedExerciseById(
  db: SQLiteDatabase,
  id: string
): Promise<PlannedExercise | null> {
  const row = await db.getFirstAsync<PlannedExerciseRow>(
    'SELECT * FROM planned_exercises WHERE id = ?',
    [id]
  );
  return row ? rowToPlannedExercise(row) : null;
}

export async function getPlannedExercisesByWorkoutDayId(
  db: SQLiteDatabase,
  workoutDayId: string
): Promise<PlannedExercise[]> {
  const rows = await db.getAllAsync<PlannedExerciseRow>(
    'SELECT * FROM planned_exercises WHERE workout_day_id = ? ORDER BY exercise_order ASC',
    [workoutDayId]
  );
  return rows.map(rowToPlannedExercise);
}
