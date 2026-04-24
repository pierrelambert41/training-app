import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  NewWorkoutDayInput,
  UpdateWorkoutDayInput,
  WorkoutDay,
} from '@/types';
import { safeEnqueue } from './sync-helpers';

const TABLE = 'workout_days';

type WorkoutDayRow = {
  id: string;
  block_id: string;
  title: string;
  day_order: number;
  split_type: string | null;
  estimated_duration_min: number | null;
  created_at: string;
};

function rowToWorkoutDay(row: WorkoutDayRow): WorkoutDay {
  return {
    id: row.id,
    blockId: row.block_id,
    title: row.title,
    dayOrder: row.day_order,
    splitType: row.split_type as WorkoutDay['splitType'],
    estimatedDurationMin: row.estimated_duration_min,
    createdAt: row.created_at,
  };
}

function toSupabasePayload(day: WorkoutDay): Record<string, unknown> {
  return {
    id: day.id,
    block_id: day.blockId,
    title: day.title,
    day_order: day.dayOrder,
    split_type: day.splitType,
    estimated_duration_min: day.estimatedDurationMin,
    created_at: day.createdAt,
  };
}

export async function insertWorkoutDay(
  db: SQLiteDatabase,
  input: NewWorkoutDayInput
): Promise<WorkoutDay> {
  const now = new Date().toISOString();
  const day: WorkoutDay = {
    id: input.id,
    blockId: input.blockId,
    title: input.title,
    dayOrder: input.dayOrder,
    splitType: input.splitType ?? null,
    estimatedDurationMin: input.estimatedDurationMin ?? null,
    createdAt: now,
  };

  await db.runAsync(
    `INSERT INTO workout_days (
      id, block_id, title, day_order, split_type, estimated_duration_min, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      day.id,
      day.blockId,
      day.title,
      day.dayOrder,
      day.splitType,
      day.estimatedDurationMin,
      day.createdAt,
    ]
  );

  await safeEnqueue(db, TABLE, day.id, 'insert', toSupabasePayload(day));
  return day;
}

export async function updateWorkoutDay(
  db: SQLiteDatabase,
  id: string,
  input: UpdateWorkoutDayInput
): Promise<WorkoutDay | null> {
  const existing = await getWorkoutDayById(db, id);
  if (!existing) return null;

  const updated: WorkoutDay = {
    ...existing,
    title: input.title ?? existing.title,
    dayOrder: input.dayOrder ?? existing.dayOrder,
    splitType:
      input.splitType !== undefined ? input.splitType : existing.splitType,
    estimatedDurationMin:
      input.estimatedDurationMin !== undefined
        ? input.estimatedDurationMin
        : existing.estimatedDurationMin,
  };

  await db.runAsync(
    `UPDATE workout_days
       SET title = ?, day_order = ?, split_type = ?, estimated_duration_min = ?
     WHERE id = ?`,
    [
      updated.title,
      updated.dayOrder,
      updated.splitType,
      updated.estimatedDurationMin,
      updated.id,
    ]
  );

  await safeEnqueue(db, TABLE, updated.id, 'update', toSupabasePayload(updated));
  return updated;
}

export async function deleteWorkoutDay(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM workout_days WHERE id = ?', [id]);
  await safeEnqueue(db, TABLE, id, 'delete', { id });
}

export async function getWorkoutDayById(
  db: SQLiteDatabase,
  id: string
): Promise<WorkoutDay | null> {
  const row = await db.getFirstAsync<WorkoutDayRow>(
    'SELECT * FROM workout_days WHERE id = ?',
    [id]
  );
  return row ? rowToWorkoutDay(row) : null;
}

export async function getWorkoutDaysByBlockId(
  db: SQLiteDatabase,
  blockId: string
): Promise<WorkoutDay[]> {
  const rows = await db.getAllAsync<WorkoutDayRow>(
    'SELECT * FROM workout_days WHERE block_id = ? ORDER BY day_order ASC',
    [blockId]
  );
  return rows.map(rowToWorkoutDay);
}
