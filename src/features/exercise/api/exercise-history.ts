import type { SQLiteDatabase } from 'expo-sqlite';
import type { Recommendation, RecommendationAction, RecommendationSource, RecommendationType } from '@/types';
import type { ExerciseSessionHistory } from '../types/exercise-history';

export type { ExerciseSessionHistory };

type SetLogHistoryRow = {
  session_id: string;
  session_date: string;
  load: number | null;
  reps: number | null;
  rir: number | null;
};

/**
 * Retourne les 5 dernières sessions distinctes pour un exercice donné.
 * Trie par date DESC et ne garde que le meilleur set (charge max) par session.
 */
export async function getExerciseHistory(
  db: SQLiteDatabase,
  exerciseId: string,
  limit = 5
): Promise<ExerciseSessionHistory[]> {
  const rows = await db.getAllAsync<SetLogHistoryRow>(
    `SELECT
      sl.session_id,
      s.date AS session_date,
      sl.load,
      sl.reps,
      sl.rir
    FROM set_logs sl
    JOIN sessions s ON s.id = sl.session_id
    WHERE sl.exercise_id = ?
      AND sl.completed = 1
      AND sl.load IS NOT NULL
    ORDER BY s.date DESC, sl.load DESC`,
    [exerciseId]
  );

  const seen = new Map<string, ExerciseSessionHistory>();
  for (const row of rows) {
    if (!seen.has(row.session_id)) {
      seen.set(row.session_id, {
        sessionId: row.session_id,
        date: row.session_date,
        bestSet: { load: row.load, reps: row.reps, rir: row.rir },
      });
    }
    if (seen.size === limit) break;
  }

  return Array.from(seen.values());
}

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

/**
 * Retourne la recommandation `load_change` la plus récente pour un exercice.
 * Utilisée pour le badge de progression (↑ ↔ ↓).
 */
export async function getLatestLoadRecommendation(
  db: SQLiteDatabase,
  exerciseId: string
): Promise<Recommendation | null> {
  const row = await db.getFirstAsync<RecommendationRow>(
    `SELECT r.*
     FROM recommendations r
     WHERE r.exercise_id = ?
       AND r.type = 'load_change'
     ORDER BY r.created_at DESC
     LIMIT 1`,
    [exerciseId]
  );
  return row ? rowToRecommendation(row) : null;
}

/**
 * Retourne la recommandation `plateau` la plus récente pour un exercice.
 * Utilisée pour le badge plateau (rouge discret si < 14 jours).
 */
export async function getLatestPlateauRecommendation(
  db: SQLiteDatabase,
  exerciseId: string
): Promise<Recommendation | null> {
  const row = await db.getFirstAsync<RecommendationRow>(
    `SELECT r.*
     FROM recommendations r
     WHERE r.exercise_id = ?
       AND r.type = 'plateau'
     ORDER BY r.created_at DESC
     LIMIT 1`,
    [exerciseId]
  );
  return row ? rowToRecommendation(row) : null;
}
