import type { SQLiteDatabase } from 'expo-sqlite';
import type { Exercise, ExerciseCategory, LogType, MovementPattern } from '@/types';

export type CustomExerciseInput = {
  id: string;
  name: string;
  movementPattern: MovementPattern;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  notes: string | null;
  createdBy: string;
};

export async function insertCustomExercise(
  db: SQLiteDatabase,
  input: CustomExerciseInput
): Promise<void> {
  const now = new Date().toISOString();
  const category: ExerciseCategory = 'isolation';
  const logType: LogType = 'weight_reps';

  await db.runAsync(
    `INSERT INTO exercises (
      id, name, name_fr, category, movement_pattern,
      primary_muscles, secondary_muscles, equipment,
      log_type, is_unilateral, systemic_fatigue, movement_stability,
      morpho_tags, recommended_progression_type, alternatives,
      coaching_notes, tags, is_custom, created_by, created_at
    ) VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 0, 'moderate', 'stable', '[]', NULL, '[]', ?, '[]', 1, ?, ?)`,
    [
      input.id,
      input.name,
      category,
      input.movementPattern,
      JSON.stringify(input.primaryMuscles),
      JSON.stringify(input.secondaryMuscles),
      JSON.stringify(input.equipment),
      logType,
      input.notes,
      input.createdBy,
      now,
    ]
  );
}

type ExerciseRow = {
  id: string;
  name: string;
  name_fr: string | null;
  category: string;
  movement_pattern: string;
  primary_muscles: string;
  secondary_muscles: string;
  equipment: string;
  log_type: string;
  is_unilateral: number;
  systemic_fatigue: string;
  movement_stability: string;
  morpho_tags: string;
  recommended_progression_type: string | null;
  alternatives: string;
  coaching_notes: string | null;
  tags: string;
  is_custom: number;
  created_by: string | null;
  created_at: string;
};

function rowToExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    name: row.name,
    nameFr: row.name_fr,
    category: row.category as Exercise['category'],
    movementPattern: row.movement_pattern as Exercise['movementPattern'],
    primaryMuscles: JSON.parse(row.primary_muscles),
    secondaryMuscles: JSON.parse(row.secondary_muscles),
    equipment: JSON.parse(row.equipment),
    logType: row.log_type as Exercise['logType'],
    isUnilateral: row.is_unilateral === 1,
    systemicFatigue: row.systemic_fatigue as Exercise['systemicFatigue'],
    movementStability: row.movement_stability as Exercise['movementStability'],
    morphoTags: JSON.parse(row.morpho_tags),
    recommendedProgressionType: row.recommended_progression_type as Exercise['recommendedProgressionType'],
    alternatives: JSON.parse(row.alternatives),
    coachingNotes: row.coaching_notes,
    tags: JSON.parse(row.tags),
    isCustom: row.is_custom === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function getExerciseById(
  db: SQLiteDatabase,
  id: string
): Promise<Exercise | null> {
  const row = await db.getFirstAsync<ExerciseRow>(
    'SELECT * FROM exercises WHERE id = ?',
    [id]
  );
  return row ? rowToExercise(row) : null;
}

export async function getExercisesByIds(
  db: SQLiteDatabase,
  ids: string[]
): Promise<Exercise[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(', ');
  const rows = await db.getAllAsync<ExerciseRow>(
    `SELECT * FROM exercises WHERE id IN (${placeholders})`,
    ids
  );
  return rows.map(rowToExercise);
}

export async function searchExercises(
  db: SQLiteDatabase,
  query: string
): Promise<Exercise[]> {
  const trimmed = query.trim();

  if (trimmed.length === 0) {
    const rows = await db.getAllAsync<ExerciseRow>(
      'SELECT * FROM exercises ORDER BY name ASC'
    );
    return rows.map(rowToExercise);
  }

  const escaped = trimmed.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
  const pattern = `%${escaped}%`;
  const rows = await db.getAllAsync<ExerciseRow>(
    "SELECT * FROM exercises WHERE name LIKE ? ESCAPE '\\' OR name_fr LIKE ? ESCAPE '\\' ORDER BY name ASC",
    [pattern, pattern]
  );
  return rows.map(rowToExercise);
}
