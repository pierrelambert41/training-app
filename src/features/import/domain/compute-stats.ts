import type { ParsedHevyData } from '../types/hevy-csv-types';
import type { ExerciseMatch } from '../types/import-state';

export type ImportStats = {
  sessionCount: number;
  exerciseCount: number;
  setCount: number;
  ignoredCount: number;
};

export function computeStats(parsedData: ParsedHevyData, mappings: ExerciseMatch[]): ImportStats {
  const ignoredNames = new Set(
    mappings.filter((m) => m.ignored).map((m) => m.hevyName),
  );
  const activeSessions = parsedData.sessions.filter(
    (s) => !ignoredNames.has(s.exerciseName),
  );
  const uniqueDates = new Set(activeSessions.map((s) => s.date));
  const uniqueExercises = new Set(activeSessions.map((s) => s.exerciseName));
  const totalSets = activeSessions.reduce((acc, s) => acc + s.sets.length, 0);
  return {
    sessionCount: uniqueDates.size,
    exerciseCount: uniqueExercises.size,
    setCount: totalSets,
    ignoredCount: ignoredNames.size,
  };
}
