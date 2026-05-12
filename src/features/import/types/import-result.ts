/**
 * Types du moteur d'import Hevy → SQLite.
 *
 * ImportResult expose le bilan d'un import : sessions importées, skippées (dédup
 * ou ignorées), et erreurs par session (exercice introuvable, erreur DB).
 * HevyExerciseMapping est le contrat d'entrée de importHevySessions — sous-ensemble
 * de ExerciseMatch (import-state.ts) que le hook adapte avant l'appel.
 */

export type HevyParsedSet = {
  setOrder: number;
  weightKg: number;
  reps: number;
};

export type HevyParsedSession = {
  /** Date ISO 8601 yyyy-MM-dd */
  date: string;
  exerciseName: string;
  sets: HevyParsedSet[];
};

export type HevyParsedData = {
  sessions: HevyParsedSession[];
};

/**
 * Mapping exercice Hevy → ID interne.
 * ignored = true → session skippée silencieusement (non comptée en erreur).
 */
export type HevyExerciseMapping = {
  hevyName: string;
  internalId: string | null;
  ignored: boolean;
};

export type ImportError = {
  sessionDate: string;
  exerciseName: string;
  reason: 'exercise_not_found' | 'db_error';
  message: string;
};

export type ImportResult = {
  imported: number;
  skipped: number;
  errors: ImportError[];
};
