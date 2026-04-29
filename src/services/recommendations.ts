import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  NewRecommendationInput,
  Recommendation,
  RecommendationAction,
  RecommendationSource,
  RecommendationType,
  UpdateRecommendationInput,
} from '@/types';
import { safeEnqueue } from './sync-helpers';

const TABLE = 'recommendations';

type RecommendationRow = {
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
  metadata: string;
  created_at: string;
};

function rowToRecommendation(row: RecommendationRow): Recommendation {
  return {
    id: row.id,
    sessionId: row.session_id,
    exerciseId: row.exercise_id,
    source: row.source as RecommendationSource,
    type: row.type as RecommendationType,
    message: row.message,
    nextLoad: row.next_load,
    nextRepTarget: row.next_rep_target,
    nextRirTarget: row.next_rir_target,
    action: row.action as RecommendationAction | null,
    confidence: row.confidence,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

function toSupabasePayload(rec: Recommendation): Record<string, unknown> {
  return {
    id: rec.id,
    session_id: rec.sessionId,
    exercise_id: rec.exerciseId,
    source: rec.source,
    type: rec.type,
    message: rec.message,
    next_load: rec.nextLoad,
    next_rep_target: rec.nextRepTarget,
    next_rir_target: rec.nextRirTarget,
    action: rec.action,
    confidence: rec.confidence,
    metadata: rec.metadata,
    created_at: rec.createdAt,
  };
}

export async function saveRecommendation(
  db: SQLiteDatabase,
  input: NewRecommendationInput
): Promise<Recommendation> {
  const now = new Date().toISOString();
  const rec: Recommendation = {
    id: input.id,
    sessionId: input.sessionId,
    exerciseId: input.exerciseId ?? null,
    source: input.source,
    type: input.type,
    message: input.message,
    nextLoad: input.nextLoad ?? null,
    nextRepTarget: input.nextRepTarget ?? null,
    nextRirTarget: input.nextRirTarget ?? null,
    action: input.action ?? null,
    confidence: input.confidence ?? null,
    metadata: input.metadata ?? {},
    createdAt: now,
  };

  await db.runAsync(
    `INSERT INTO recommendations (
      id, session_id, exercise_id, source, type, message,
      next_load, next_rep_target, next_rir_target,
      action, confidence, metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      rec.id,
      rec.sessionId,
      rec.exerciseId,
      rec.source,
      rec.type,
      rec.message,
      rec.nextLoad,
      rec.nextRepTarget,
      rec.nextRirTarget,
      rec.action,
      rec.confidence,
      JSON.stringify(rec.metadata),
      rec.createdAt,
    ]
  );

  await safeEnqueue(db, TABLE, rec.id, 'insert', toSupabasePayload(rec));
  return rec;
}

export async function updateRecommendation(
  db: SQLiteDatabase,
  id: string,
  input: UpdateRecommendationInput
): Promise<Recommendation | null> {
  const existing = await getRecommendationById(db, id);
  if (!existing) return null;

  const updated: Recommendation = {
    ...existing,
    message: input.message ?? existing.message,
    nextLoad: input.nextLoad !== undefined ? input.nextLoad : existing.nextLoad,
    nextRepTarget:
      input.nextRepTarget !== undefined
        ? input.nextRepTarget
        : existing.nextRepTarget,
    nextRirTarget:
      input.nextRirTarget !== undefined
        ? input.nextRirTarget
        : existing.nextRirTarget,
    action: input.action !== undefined ? input.action : existing.action,
    confidence:
      input.confidence !== undefined ? input.confidence : existing.confidence,
    metadata: input.metadata !== undefined ? input.metadata : existing.metadata,
  };

  await db.runAsync(
    `UPDATE recommendations
       SET message = ?, next_load = ?, next_rep_target = ?, next_rir_target = ?,
           action = ?, confidence = ?, metadata = ?
     WHERE id = ?`,
    [
      updated.message,
      updated.nextLoad,
      updated.nextRepTarget,
      updated.nextRirTarget,
      updated.action,
      updated.confidence,
      JSON.stringify(updated.metadata),
      updated.id,
    ]
  );

  await safeEnqueue(db, TABLE, updated.id, 'update', toSupabasePayload(updated));
  return updated;
}

export async function deleteRecommendation(
  db: SQLiteDatabase,
  id: string
): Promise<void> {
  await db.runAsync('DELETE FROM recommendations WHERE id = ?', [id]);
  await safeEnqueue(db, TABLE, id, 'delete', { id });
}

export async function getRecommendationById(
  db: SQLiteDatabase,
  id: string
): Promise<Recommendation | null> {
  const row = await db.getFirstAsync<RecommendationRow>(
    'SELECT * FROM recommendations WHERE id = ?',
    [id]
  );
  return row ? rowToRecommendation(row) : null;
}

/**
 * Lit toutes les recommandations d'une séance, ordonnées par created_at ASC.
 * Utilise idx_recommendations_session.
 */
export async function getRecommendationsBySession(
  db: SQLiteDatabase,
  sessionId: string
): Promise<Recommendation[]> {
  const rows = await db.getAllAsync<RecommendationRow>(
    'SELECT * FROM recommendations WHERE session_id = ? ORDER BY created_at ASC',
    [sessionId]
  );
  return rows.map(rowToRecommendation);
}

/**
 * Supprime toutes les recommandations d'une séance et enqueue les deletes.
 * Utilisé avant de recalculer les recommandations d'une séance terminée.
 */
export async function clearRecommendationsForSession(
  db: SQLiteDatabase,
  sessionId: string
): Promise<void> {
  const existing = await getRecommendationsBySession(db, sessionId);
  for (const rec of existing) {
    await db.runAsync('DELETE FROM recommendations WHERE id = ?', [rec.id]);
    await safeEnqueue(db, TABLE, rec.id, 'delete', { id: rec.id });
  }
}
