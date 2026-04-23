import type { SQLiteDatabase } from 'expo-sqlite';

export async function getExerciseFavorite(
  db: SQLiteDatabase,
  exerciseId: string
): Promise<boolean> {
  const row = await db.getFirstAsync<{ exercise_id: string }>(
    'SELECT exercise_id FROM exercise_favorites WHERE exercise_id = ?',
    [exerciseId]
  );
  return row !== null;
}

export async function toggleExerciseFavorite(
  db: SQLiteDatabase,
  exerciseId: string
): Promise<boolean> {
  const isFavorite = await getExerciseFavorite(db, exerciseId);

  if (isFavorite) {
    await db.runAsync(
      'DELETE FROM exercise_favorites WHERE exercise_id = ?',
      [exerciseId]
    );
    return false;
  }

  await db.runAsync(
    'INSERT INTO exercise_favorites (exercise_id, created_at) VALUES (?, ?)',
    [exerciseId, new Date().toISOString()]
  );
  return true;
}
