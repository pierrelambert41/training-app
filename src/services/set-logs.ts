import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  NewSetLogInput,
  SetLog,
  SetLogSide,
  UpdateSetLogInput,
} from '@/types';
import { safeEnqueue } from './sync-helpers';

const TABLE = 'set_logs';

type SetLogRow = {
  id: string;
  session_id: string;
  exercise_id: string;
  planned_exercise_id: string | null;
  set_number: number;
  target_load: number | null;
  target_reps: number | null;
  target_rir: number | null;
  load: number | null;
  reps: number | null;
  rir: number | null;
  duration_seconds: number | null;
  distance_meters: number | null;
  completed: number;
  side: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function rowToSetLog(row: SetLogRow): SetLog {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    plannedExerciseId: row.planned_exercise_id,
    setNumber: row.set_number,
    targetLoad: row.target_load,
    targetReps: row.target_reps,
    targetRir: row.target_rir,
    load: row.load,
    reps: row.reps,
    rir: row.rir,
    durationSeconds: row.duration_seconds,
    distanceMeters: row.distance_meters,
    completed: row.completed === 1,
    // Safe cast : la CHECK constraint DB garantit que side ∈ {left, right} ou NULL.
    side: row.side as SetLogSide | null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Payload Supabase — snake_case, booleans natifs (cf. ADR-012).
 */
function toSupabasePayload(setLog: SetLog): Record<string, unknown> {
  return {
    id: setLog.id,
    session_id: setLog.sessionId,
    exercise_id: setLog.exerciseId,
    planned_exercise_id: setLog.plannedExerciseId,
    set_number: setLog.setNumber,
    target_load: setLog.targetLoad,
    target_reps: setLog.targetReps,
    target_rir: setLog.targetRir,
    load: setLog.load,
    reps: setLog.reps,
    rir: setLog.rir,
    duration_seconds: setLog.durationSeconds,
    distance_meters: setLog.distanceMeters,
    completed: setLog.completed,
    side: setLog.side,
    notes: setLog.notes,
    created_at: setLog.createdAt,
    updated_at: setLog.updatedAt,
  };
}

function assertValidSetNumber(setNumber: number): void {
  if (!Number.isInteger(setNumber) || setNumber < 1) {
    throw new Error(
      `Invalid set_number: ${setNumber}. Contraint DB équivalent : set_number > 0.`
    );
  }
}

export async function insertSetLog(
  db: SQLiteDatabase,
  input: NewSetLogInput
): Promise<SetLog> {
  assertValidSetNumber(input.setNumber);

  const now = new Date().toISOString();
  const setLog: SetLog = {
    id: input.id,
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    plannedExerciseId: input.plannedExerciseId ?? null,
    setNumber: input.setNumber,
    targetLoad: input.targetLoad ?? null,
    targetReps: input.targetReps ?? null,
    targetRir: input.targetRir ?? null,
    load: input.load ?? null,
    reps: input.reps ?? null,
    rir: input.rir ?? null,
    durationSeconds: input.durationSeconds ?? null,
    distanceMeters: input.distanceMeters ?? null,
    completed: input.completed ?? true,
    side: input.side ?? null,
    notes: input.notes ?? null,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO set_logs (
      id, session_id, exercise_id, planned_exercise_id, set_number,
      target_load, target_reps, target_rir,
      load, reps, rir, duration_seconds, distance_meters,
      completed, side, notes, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      setLog.id,
      setLog.sessionId,
      setLog.exerciseId,
      setLog.plannedExerciseId,
      setLog.setNumber,
      setLog.targetLoad,
      setLog.targetReps,
      setLog.targetRir,
      setLog.load,
      setLog.reps,
      setLog.rir,
      setLog.durationSeconds,
      setLog.distanceMeters,
      setLog.completed ? 1 : 0,
      setLog.side,
      setLog.notes,
      setLog.createdAt,
      setLog.updatedAt,
    ]
  );

  await safeEnqueue(db, TABLE, setLog.id, 'insert', toSupabasePayload(setLog));
  return setLog;
}

export async function updateSetLog(
  db: SQLiteDatabase,
  id: string,
  input: UpdateSetLogInput
): Promise<SetLog | null> {
  const existing = await getSetLogById(db, id);
  if (!existing) return null;

  if (input.setNumber !== undefined) assertValidSetNumber(input.setNumber);

  const now = new Date().toISOString();
  const updated: SetLog = {
    ...existing,
    setNumber: input.setNumber ?? existing.setNumber,
    targetLoad:
      input.targetLoad !== undefined ? input.targetLoad : existing.targetLoad,
    targetReps:
      input.targetReps !== undefined ? input.targetReps : existing.targetReps,
    targetRir:
      input.targetRir !== undefined ? input.targetRir : existing.targetRir,
    load: input.load !== undefined ? input.load : existing.load,
    reps: input.reps !== undefined ? input.reps : existing.reps,
    rir: input.rir !== undefined ? input.rir : existing.rir,
    durationSeconds:
      input.durationSeconds !== undefined
        ? input.durationSeconds
        : existing.durationSeconds,
    distanceMeters:
      input.distanceMeters !== undefined
        ? input.distanceMeters
        : existing.distanceMeters,
    completed: input.completed ?? existing.completed,
    side: input.side !== undefined ? input.side : existing.side,
    notes: input.notes !== undefined ? input.notes : existing.notes,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE set_logs
       SET set_number = ?,
           target_load = ?, target_reps = ?, target_rir = ?,
           load = ?, reps = ?, rir = ?, duration_seconds = ?, distance_meters = ?,
           completed = ?, side = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    [
      updated.setNumber,
      updated.targetLoad,
      updated.targetReps,
      updated.targetRir,
      updated.load,
      updated.reps,
      updated.rir,
      updated.durationSeconds,
      updated.distanceMeters,
      updated.completed ? 1 : 0,
      updated.side,
      updated.notes,
      updated.updatedAt,
      updated.id,
    ]
  );

  await safeEnqueue(db, TABLE, updated.id, 'update', toSupabasePayload(updated));
  return updated;
}

export async function deleteSetLog(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM set_logs WHERE id = ?', [id]);
  await safeEnqueue(db, TABLE, id, 'delete', { id });
}

export async function getSetLogById(
  db: SQLiteDatabase,
  id: string
): Promise<SetLog | null> {
  const row = await db.getFirstAsync<SetLogRow>(
    'SELECT * FROM set_logs WHERE id = ?',
    [id]
  );
  return row ? rowToSetLog(row) : null;
}

/**
 * Lit toutes les séries d'une séance, ordonnées par exercise_id puis set_number.
 * L'UI logger groupera ensuite par exercise_id.
 */
export async function getSetLogsBySessionId(
  db: SQLiteDatabase,
  sessionId: string
): Promise<SetLog[]> {
  const rows = await db.getAllAsync<SetLogRow>(
    `SELECT * FROM set_logs
     WHERE session_id = ?
     ORDER BY exercise_id ASC, set_number ASC, created_at ASC`,
    [sessionId]
  );
  return rows.map(rowToSetLog);
}

/**
 * Lit les séries d'un exercice donné dans une séance — utile pour l'UI
 * d'un exercice live et pour l'historique "dernière performance".
 */
export async function getSetLogsBySessionAndExercise(
  db: SQLiteDatabase,
  sessionId: string,
  exerciseId: string
): Promise<SetLog[]> {
  const rows = await db.getAllAsync<SetLogRow>(
    `SELECT * FROM set_logs
     WHERE session_id = ? AND exercise_id = ?
     ORDER BY set_number ASC, created_at ASC`,
    [sessionId, exerciseId]
  );
  return rows.map(rowToSetLog);
}

/**
 * Dernière série loggée pour un exercice donné (hors session courante).
 * Utilisé pour le pré-remplissage intelligent dans l'écran live.
 * Retourne null s'il n'y a pas d'historique.
 */
export async function getLastSetLogForExercise(
  db: SQLiteDatabase,
  exerciseId: string,
  excludeSessionId?: string
): Promise<SetLog | null> {
  const excludeClause = excludeSessionId ? 'AND session_id != ?' : '';
  const params: string[] = excludeSessionId
    ? [exerciseId, excludeSessionId]
    : [exerciseId];

  const row = await db.getFirstAsync<SetLogRow>(
    `SELECT sl.* FROM set_logs sl
     JOIN sessions s ON sl.session_id = s.id
     WHERE sl.exercise_id = ? ${excludeClause}
       AND sl.completed = 1
     ORDER BY s.date DESC, sl.set_number DESC
     LIMIT 1`,
    params
  );
  return row ? rowToSetLog(row) : null;
}

/**
 * Dernière série loggée pour un exercice unilatéral, filtrée par côté.
 * Utilisé pour le pré-remplissage intelligent par côté (G/D).
 * Retourne null s'il n'y a pas d'historique pour ce côté.
 */
export async function getLastSetLogForExerciseBySide(
  db: SQLiteDatabase,
  exerciseId: string,
  side: SetLogSide,
  excludeSessionId?: string
): Promise<SetLog | null> {
  const excludeClause = excludeSessionId ? 'AND sl.session_id != ?' : '';
  const params: (string | null)[] = excludeSessionId
    ? [exerciseId, side, excludeSessionId]
    : [exerciseId, side];

  const row = await db.getFirstAsync<SetLogRow>(
    `SELECT sl.* FROM set_logs sl
     JOIN sessions s ON sl.session_id = s.id
     WHERE sl.exercise_id = ? AND sl.side = ? ${excludeClause}
       AND sl.completed = 1
     ORDER BY s.date DESC, sl.set_number DESC
     LIMIT 1`,
    params
  );
  return row ? rowToSetLog(row) : null;
}
