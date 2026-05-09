import type { SQLiteDatabase } from 'expo-sqlite';
import type { ExerciseRef } from '../domain/exercise-matcher';

type ExerciseRow = {
  id: string;
  name: string;
};

export async function getAllExerciseRefs(db: SQLiteDatabase): Promise<ExerciseRef[]> {
  const rows = await db.getAllAsync<ExerciseRow>(
    'SELECT id, name FROM exercises ORDER BY name ASC',
  );
  return rows.map((row) => ({ id: row.id, name: row.name }));
}
