import type { SQLiteDatabase } from 'expo-sqlite';
import type { ConflictCheckedTable } from '../types/conflict';

/**
 * Quand remote gagne (TA-122 AC2) : on copie les colonnes utiles de la ligne
 * remote dans la table SQLite locale. Le SELECT a été fait par le sync-service
 * (cf. `fetchRemoteRow`). Ici on consomme le row remote et on UPDATE local
 * via une SQL parametrée et constante par table (pas de template literal
 * dynamique — cohérent avec `stampSourceSyncedAt`).
 *
 * Limites assumées :
 * - On ne copie QUE les colonnes communes au schéma local. Les colonnes
 *   manquantes côté local (ex: futur ajout côté Supabase) sont ignorées.
 * - L'UPDATE WHERE id matche : si la ligne locale n'existe pas (cas tordu :
 *   on a poussé un INSERT mais le local a été nettoyé entre temps), changes=0
 *   et on log warning. Pas d'INSERT speculatif (refuserait d'écraser un user
 *   actif).
 */

type RemoteRowMap = {
  sessions: RemoteSessionRow;
  set_logs: RemoteSetLogRow;
  recommendations: RemoteRecommendationRow;
};

type RemoteSessionRow = {
  id: string;
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
  updated_at: string;
};

type RemoteSetLogRow = {
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
  completed: boolean;
  side: 'left' | 'right' | null;
  notes: string | null;
  updated_at: string;
};

type RemoteRecommendationRow = {
  id: string;
  session_id: string;
  exercise_id: string | null;
  source: string;
  type: string;
  message: string;
  next_load: number | null;
  next_rep_target: number | null;
  next_rir_target: number | null;
  action: string | null;
  confidence: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type CopyRemoteRowResult = {
  changes: number;
};

export async function copyRemoteRowToLocal<T extends ConflictCheckedTable>(
  db: SQLiteDatabase,
  table: T,
  remote: RemoteRowMap[T]
): Promise<CopyRemoteRowResult> {
  if (table === 'sessions') {
    return copySessionRow(db, remote as RemoteSessionRow);
  }
  if (table === 'set_logs') {
    return copySetLogRow(db, remote as RemoteSetLogRow);
  }
  return copyRecommendationRow(db, remote as RemoteRecommendationRow);
}

async function copySessionRow(
  db: SQLiteDatabase,
  row: RemoteSessionRow
): Promise<CopyRemoteRowResult> {
  // Note : on ne touche pas à `user_id`, `created_at`, ni `synced_at`. user_id
  // est immuable, created_at idem. synced_at sera stamp par le sync-service
  // à l'étape suivante.
  const sql = `UPDATE sessions SET
    workout_day_id = ?, block_id = ?, date = ?,
    started_at = ?, ended_at = ?, status = ?,
    readiness = ?, energy = ?, motivation = ?, sleep_quality = ?, pre_session_notes = ?,
    completion_score = ?, performance_score = ?, fatigue_score = ?, post_session_notes = ?,
    device_id = ?, updated_at = ?
   WHERE id = ?`;
  const result = await db.runAsync(sql, [
    row.workout_day_id,
    row.block_id,
    row.date,
    row.started_at,
    row.ended_at,
    row.status,
    row.readiness,
    row.energy,
    row.motivation,
    row.sleep_quality,
    row.pre_session_notes,
    row.completion_score,
    row.performance_score,
    row.fatigue_score,
    row.post_session_notes,
    row.device_id,
    row.updated_at,
    row.id,
  ]);
  return { changes: result.changes };
}

async function copySetLogRow(
  db: SQLiteDatabase,
  row: RemoteSetLogRow
): Promise<CopyRemoteRowResult> {
  const sql = `UPDATE set_logs SET
    session_id = ?, exercise_id = ?, planned_exercise_id = ?, set_number = ?,
    target_load = ?, target_reps = ?, target_rir = ?,
    load = ?, reps = ?, rir = ?,
    duration_seconds = ?, distance_meters = ?,
    completed = ?, side = ?, notes = ?, updated_at = ?
   WHERE id = ?`;
  const result = await db.runAsync(sql, [
    row.session_id,
    row.exercise_id,
    row.planned_exercise_id,
    row.set_number,
    row.target_load,
    row.target_reps,
    row.target_rir,
    row.load,
    row.reps,
    row.rir,
    row.duration_seconds,
    row.distance_meters,
    row.completed ? 1 : 0,
    row.side,
    row.notes,
    row.updated_at,
    row.id,
  ]);
  return { changes: result.changes };
}

async function copyRecommendationRow(
  db: SQLiteDatabase,
  row: RemoteRecommendationRow
): Promise<CopyRemoteRowResult> {
  // recommendations n'a pas d'updated_at — on copie uniquement les colonnes
  // de contenu. created_at reste intouché (utilisé pour le LWW proxy).
  const sql = `UPDATE recommendations SET
    session_id = ?, exercise_id = ?, source = ?, type = ?, message = ?,
    next_load = ?, next_rep_target = ?, next_rir_target = ?,
    action = ?, confidence = ?, metadata = ?
   WHERE id = ?`;
  const result = await db.runAsync(sql, [
    row.session_id,
    row.exercise_id,
    row.source,
    row.type,
    row.message,
    row.next_load,
    row.next_rep_target,
    row.next_rir_target,
    row.action,
    row.confidence,
    JSON.stringify(row.metadata ?? {}),
    row.id,
  ]);
  return { changes: result.changes };
}
