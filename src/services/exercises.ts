import type { SQLiteDatabase } from 'expo-sqlite';
import type { Exercise } from '@/types';

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
