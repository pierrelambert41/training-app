import type { ParsedHevyData } from './hevy-csv-types';

export type ImportStep = 'file_selection' | 'exercise_mapping' | 'confirmation';

export type ExerciseMatch = {
  hevyName: string;
  internalId: string | null;
  internalName: string | null;
  score: number;
  ignored: boolean;
};

export type ImportState = {
  step: ImportStep;
  fileName: string | null;
  fileContent: string | null;
  parsedData: ParsedHevyData | null;
  exerciseMappings: ExerciseMatch[];
};
