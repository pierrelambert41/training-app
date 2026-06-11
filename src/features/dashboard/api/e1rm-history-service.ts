import type { SQLiteDatabase } from 'expo-sqlite';
import {
  buildE1rmHistory,
  type E1rmPoint,
  type E1rmSetRow,
  type LoggedExercise,
} from '../domain/e1rm-history';

const DEFAULT_WINDOW_DAYS = 90;

/**
 * Exercices sélectionnables pour le graphe e1RM : log_type weight_reps
 * uniquement (le e1RM n'a pas de sens pour duration/distance), avec au moins
 * une séance complétée. Triés par volume d'historique décroissant.
 */
export async function getExercisesWithHistory(
  db: SQLiteDatabase,
  userId: string
): Promise<LoggedExercise[]> {
  return db.getAllAsync<LoggedExercise>(
    `SELECT e.id AS id, COALESCE(e.name_fr, e.name) AS name,
            COUNT(DISTINCT s.id) AS sessionCount
     FROM set_logs sl
     JOIN sessions s ON s.id = sl.session_id
     JOIN exercises e ON e.id = sl.exercise_id
     WHERE s.user_id = ?
       AND s.status = 'completed'
       AND sl.completed = 1
       AND sl.load IS NOT NULL AND sl.reps IS NOT NULL
       AND e.log_type = 'weight_reps'
     GROUP BY e.id
     ORDER BY sessionCount DESC, name ASC`,
    [userId]
  );
}

/**
 * Historique e1RM d'un exercice : meilleur e1RM par séance complétée sur la
 * fenêtre donnée (90 jours par défaut), tri chronologique.
 */
export async function getE1rmHistory(
  db: SQLiteDatabase,
  userId: string,
  exerciseId: string,
  windowDays: number = DEFAULT_WINDOW_DAYS
): Promise<E1rmPoint[]> {
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const rows = await db.getAllAsync<E1rmSetRow>(
    `SELECT s.date AS date, sl.load AS load, sl.reps AS reps
     FROM set_logs sl
     JOIN sessions s ON s.id = sl.session_id
     WHERE s.user_id = ?
       AND sl.exercise_id = ?
       AND s.status = 'completed'
       AND sl.completed = 1
       AND s.date >= ?`,
    [userId, exerciseId, cutoff]
  );

  return buildE1rmHistory(rows);
}
