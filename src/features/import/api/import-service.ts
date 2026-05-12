import type { SQLiteDatabase } from 'expo-sqlite';
import { insertSession } from '@/services/sessions';
import { insertSetLog } from '@/services/set-logs';
import { generateUUID } from '@/utils/uuid';
import type {
  HevyExerciseMapping,
  HevyParsedData,
  HevyParsedSession,
  ImportError,
  ImportResult,
} from '../types/import-result';

type ExerciseMappingIndex = Record<string, string>;

function buildMappingIndex(mappings: HevyExerciseMapping[]): ExerciseMappingIndex {
  const index: ExerciseMappingIndex = {};
  for (const m of mappings) {
    if (!m.ignored && m.internalId !== null) {
      index[m.hevyName] = m.internalId;
    }
  }
  return index;
}

function getExerciseIdForSession(session: HevyParsedSession, mappingIndex: ExerciseMappingIndex): string[] {
  const exerciseId = mappingIndex[session.exerciseName];
  return exerciseId ? [exerciseId] : [];
}

async function sessionAlreadyExists(
  db: SQLiteDatabase,
  userId: string,
  date: string,
  exerciseIds: string[]
): Promise<boolean> {
  if (exerciseIds.length === 0) return false;

  type Row = { id: string };

  const existingSessions = await db.getAllAsync<Row>(
    `SELECT id FROM sessions WHERE user_id = ? AND date = ? AND status = 'completed'`,
    [userId, date]
  );

  if (existingSessions.length === 0) return false;

  for (const { id: sessionId } of existingSessions) {
    type ExRow = { exercise_id: string };
    const existingExercises = await db.getAllAsync<ExRow>(
      `SELECT DISTINCT exercise_id FROM set_logs WHERE session_id = ?`,
      [sessionId]
    );

    const existingIds = new Set(existingExercises.map((r) => r.exercise_id));
    const allMatch = exerciseIds.every((id) => existingIds.has(id));
    if (allMatch && exerciseIds.length === existingIds.size) return true;
  }

  return false;
}

async function importOneSession(
  db: SQLiteDatabase,
  userId: string,
  session: HevyParsedSession,
  mappingIndex: ExerciseMappingIndex
): Promise<'imported' | 'skipped' | ImportError> {
  const exerciseId = mappingIndex[session.exerciseName];

  if (!exerciseId) {
    return {
      sessionDate: session.date,
      exerciseName: session.exerciseName,
      reason: 'exercise_not_found',
      message: `Exercice "${session.exerciseName}" absent de la base locale après mapping.`,
    };
  }

  const exerciseIds = getExerciseIdForSession(session, mappingIndex);
  const alreadyExists = await sessionAlreadyExists(db, userId, session.date, exerciseIds);
  if (alreadyExists) return 'skipped';

  try {
    const sessionId = generateUUID();
    await insertSession(db, {
      id: sessionId,
      userId,
      workoutDayId: null,
      blockId: null,
      date: session.date,
      status: 'completed',
      preSessionNotes: 'Importé depuis Hevy',
    });

    for (let i = 0; i < session.sets.length; i++) {
      const set = session.sets[i];
      await insertSetLog(db, {
        id: generateUUID(),
        sessionId,
        exerciseId,
        setNumber: i + 1,
        load: set.weightKg,
        reps: set.reps,
        rir: null,
        completed: true,
      });
    }

    return 'imported';
  } catch (err) {
    return {
      sessionDate: session.date,
      exerciseName: session.exerciseName,
      reason: 'db_error',
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Importe les séances parsées depuis un export CSV Hevy dans SQLite.
 *
 * - Chaque session ignorée (exercice non mappé / ignored) est skippée silencieusement.
 * - Déduplication : session avec même date + mêmes exercise_ids déjà en base → skipped.
 * - Import transactionnel par session : une erreur n'arrête pas les autres.
 * - Les sessions importées sont enfilées dans la SyncQueue via safeEnqueue (déjà fait
 *   par insertSession/insertSetLog qui appellent safeEnqueue en interne).
 */
export async function importHevySessions(
  db: SQLiteDatabase,
  parsedData: HevyParsedData,
  exerciseMappings: HevyExerciseMapping[],
  userId: string
): Promise<ImportResult> {
  const mappingIndex = buildMappingIndex(exerciseMappings);

  const ignoredNames = new Set(
    exerciseMappings.filter((m) => m.ignored).map((m) => m.hevyName)
  );

  let imported = 0;
  let skipped = 0;
  const errors: ImportError[] = [];

  for (const session of parsedData.sessions) {
    if (ignoredNames.has(session.exerciseName)) {
      skipped++;
      continue;
    }

    const result = await importOneSession(db, userId, session, mappingIndex);

    if (result === 'imported') {
      imported++;
    } else if (result === 'skipped') {
      skipped++;
    } else {
      errors.push(result);
    }
  }

  return { imported, skipped, errors };
}
