import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  NewSessionInput,
  Session,
  SessionStatus,
  UpdateSessionInput,
} from '@/types';
import { safeEnqueue } from './sync-helpers';
import { getOrCreateDeviceId } from './device-id';

const TABLE = 'sessions';

type SessionRow = {
  id: string;
  user_id: string;
  workout_day_id: string | null;
  block_id: string | null;
  date: string;
  started_at: string | null;
  ended_at: string | null;
  status: string;
  readiness: number | null;
  energy: number | null;
  motivation: number | null;
  sleep_quality: number | null;
  pre_session_notes: string | null;
  completion_score: number | null;
  performance_score: number | null;
  fatigue_score: number | null;
  post_session_notes: string | null;
  device_id: string | null;
  synced_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    userId: row.user_id,
    workoutDayId: row.workout_day_id,
    blockId: row.block_id,
    date: row.date,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    status: row.status as SessionStatus,
    readiness: row.readiness,
    energy: row.energy,
    motivation: row.motivation,
    sleepQuality: row.sleep_quality,
    preSessionNotes: row.pre_session_notes,
    completionScore: row.completion_score,
    performanceScore: row.performance_score,
    fatigueScore: row.fatigue_score,
    postSessionNotes: row.post_session_notes,
    deviceId: row.device_id,
    syncedAt: row.synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Payload Supabase — snake_case, jsonb-ready (cf. ADR-012).
 * `synced_at` n'est jamais inclus : il est renseigné côté serveur ou par le
 * sync engine (Phase 6) après réception.
 */
function toSupabasePayload(session: Session): Record<string, unknown> {
  return {
    id: session.id,
    user_id: session.userId,
    workout_day_id: session.workoutDayId,
    block_id: session.blockId,
    date: session.date,
    started_at: session.startedAt,
    ended_at: session.endedAt,
    status: session.status,
    readiness: session.readiness,
    energy: session.energy,
    motivation: session.motivation,
    sleep_quality: session.sleepQuality,
    pre_session_notes: session.preSessionNotes,
    completion_score: session.completionScore,
    performance_score: session.performanceScore,
    fatigue_score: session.fatigueScore,
    post_session_notes: session.postSessionNotes,
    device_id: session.deviceId,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  };
}

export async function insertSession(
  db: SQLiteDatabase,
  input: NewSessionInput
): Promise<Session> {
  const now = new Date().toISOString();
  const deviceId = input.deviceId ?? (await getOrCreateDeviceId(db));

  const session: Session = {
    id: input.id,
    userId: input.userId,
    workoutDayId: input.workoutDayId ?? null,
    blockId: input.blockId ?? null,
    date: input.date,
    startedAt: input.startedAt ?? null,
    endedAt: input.endedAt ?? null,
    status: input.status ?? 'in_progress',
    readiness: input.readiness ?? null,
    energy: input.energy ?? null,
    motivation: input.motivation ?? null,
    sleepQuality: input.sleepQuality ?? null,
    preSessionNotes: input.preSessionNotes ?? null,
    completionScore: null,
    performanceScore: null,
    fatigueScore: null,
    postSessionNotes: input.postSessionNotes ?? null,
    deviceId,
    syncedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO sessions (
      id, user_id, workout_day_id, block_id, date,
      started_at, ended_at, status,
      readiness, energy, motivation, sleep_quality, pre_session_notes,
      completion_score, performance_score, fatigue_score, post_session_notes,
      device_id, synced_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      session.id,
      session.userId,
      session.workoutDayId,
      session.blockId,
      session.date,
      session.startedAt,
      session.endedAt,
      session.status,
      session.readiness,
      session.energy,
      session.motivation,
      session.sleepQuality,
      session.preSessionNotes,
      session.completionScore,
      session.performanceScore,
      session.fatigueScore,
      session.postSessionNotes,
      session.deviceId,
      session.syncedAt,
      session.createdAt,
      session.updatedAt,
    ]
  );

  await safeEnqueue(db, TABLE, session.id, 'insert', toSupabasePayload(session));
  return session;
}

export async function updateSession(
  db: SQLiteDatabase,
  id: string,
  input: UpdateSessionInput
): Promise<Session | null> {
  const existing = await getSessionById(db, id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updated: Session = {
    ...existing,
    workoutDayId:
      input.workoutDayId !== undefined ? input.workoutDayId : existing.workoutDayId,
    blockId: input.blockId !== undefined ? input.blockId : existing.blockId,
    date: input.date ?? existing.date,
    startedAt: input.startedAt !== undefined ? input.startedAt : existing.startedAt,
    endedAt: input.endedAt !== undefined ? input.endedAt : existing.endedAt,
    status: input.status ?? existing.status,
    readiness:
      input.readiness !== undefined ? input.readiness : existing.readiness,
    energy: input.energy !== undefined ? input.energy : existing.energy,
    motivation:
      input.motivation !== undefined ? input.motivation : existing.motivation,
    sleepQuality:
      input.sleepQuality !== undefined ? input.sleepQuality : existing.sleepQuality,
    preSessionNotes:
      input.preSessionNotes !== undefined
        ? input.preSessionNotes
        : existing.preSessionNotes,
    completionScore:
      input.completionScore !== undefined
        ? input.completionScore
        : existing.completionScore,
    performanceScore:
      input.performanceScore !== undefined
        ? input.performanceScore
        : existing.performanceScore,
    fatigueScore:
      input.fatigueScore !== undefined ? input.fatigueScore : existing.fatigueScore,
    postSessionNotes:
      input.postSessionNotes !== undefined
        ? input.postSessionNotes
        : existing.postSessionNotes,
    updatedAt: now,
  };

  await db.runAsync(
    `UPDATE sessions
       SET workout_day_id = ?, block_id = ?, date = ?,
           started_at = ?, ended_at = ?, status = ?,
           readiness = ?, energy = ?, motivation = ?, sleep_quality = ?, pre_session_notes = ?,
           completion_score = ?, performance_score = ?, fatigue_score = ?, post_session_notes = ?,
           updated_at = ?
     WHERE id = ?`,
    [
      updated.workoutDayId,
      updated.blockId,
      updated.date,
      updated.startedAt,
      updated.endedAt,
      updated.status,
      updated.readiness,
      updated.energy,
      updated.motivation,
      updated.sleepQuality,
      updated.preSessionNotes,
      updated.completionScore,
      updated.performanceScore,
      updated.fatigueScore,
      updated.postSessionNotes,
      updated.updatedAt,
      updated.id,
    ]
  );

  await safeEnqueue(db, TABLE, updated.id, 'update', toSupabasePayload(updated));
  return updated;
}

/**
 * Suppression d'une séance : supprime d'abord les set_logs locaux (et enqueue
 * leur delete), puis la session. Côté Supabase, ON DELETE CASCADE sur set_logs
 * fait le ménage automatiquement, mais on enqueue quand même les deletes
 * individuellement pour garder la SyncQueue lisible et idempotente.
 */
export async function deleteSession(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  const childIds = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM set_logs WHERE session_id = ?',
    [id]
  );

  for (const { id: childId } of childIds) {
    await db.runAsync('DELETE FROM set_logs WHERE id = ?', [childId]);
    await safeEnqueue(db, 'set_logs', childId, 'delete', { id: childId });
  }

  await db.runAsync('DELETE FROM sessions WHERE id = ?', [id]);
  await safeEnqueue(db, TABLE, id, 'delete', { id });
}

export async function getSessionById(
  db: SQLiteDatabase,
  id: string
): Promise<Session | null> {
  const row = await db.getFirstAsync<SessionRow>(
    'SELECT * FROM sessions WHERE id = ?',
    [id]
  );
  return row ? rowToSession(row) : null;
}

/**
 * Liste les séances d'un utilisateur, plus récentes en premier.
 * Utilise idx_sessions_user_date (defini à la migration initiale).
 */
export async function getSessionsByUserId(
  db: SQLiteDatabase,
  userId: string,
  limit?: number
): Promise<Session[]> {
  const rows = limit
    ? await db.getAllAsync<SessionRow>(
        'SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT ?',
        [userId, limit]
      )
    : await db.getAllAsync<SessionRow>(
        'SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC, created_at DESC',
        [userId]
      );
  return rows.map(rowToSession);
}

/**
 * Conservé depuis TA-25 : compteur de séances `completed` par workout_day
 * pour un bloc donné. Utilisé par l'UI "détail bloc" pour afficher la
 * progression jour par jour.
 */
type SessionCountRow = {
  workout_day_id: string;
  count: number;
};

export async function getSessionCountsByBlockId(
  db: SQLiteDatabase,
  blockId: string
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<SessionCountRow>(
    `SELECT workout_day_id, COUNT(*) as count
     FROM sessions
     WHERE block_id = ? AND status = 'completed'
     GROUP BY workout_day_id`,
    [blockId]
  );

  return rows.reduce<Record<string, number>>((acc, row) => {
    if (row.workout_day_id) acc[row.workout_day_id] = row.count;
    return acc;
  }, {});
}
