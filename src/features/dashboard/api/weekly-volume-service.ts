import type { SQLiteDatabase } from 'expo-sqlite';
import {
  countWeeklySetsByMuscle,
  type MuscleVolume,
  type VolumeSetRow,
} from '../domain/weekly-volume';

type SetMuscleRow = {
  primary_muscles: string;
};

/**
 * Séries complétées par groupe musculaire sur [start, end] inclus
 * (sets completed=1 de séances completed). Comptage agoniste fait en domain.
 */
export async function getWeeklyVolumeByMuscle(
  db: SQLiteDatabase,
  userId: string,
  start: string,
  end: string
): Promise<MuscleVolume[]> {
  const rows = await db.getAllAsync<SetMuscleRow>(
    `SELECT e.primary_muscles AS primary_muscles
     FROM set_logs sl
     JOIN sessions s ON s.id = sl.session_id
     JOIN exercises e ON e.id = sl.exercise_id
     WHERE s.user_id = ?
       AND s.status = 'completed'
       AND sl.completed = 1
       AND s.date >= ? AND s.date <= ?`,
    [userId, start, end]
  );

  const volumeRows: VolumeSetRow[] = rows.map((r) => ({
    primaryMuscles: r.primary_muscles,
  }));

  return countWeeklySetsByMuscle(volumeRows);
}
