import type { TrainingLevel, EquipmentType } from './user';
import type { ProgramGoal } from './program';
import type { Exercise } from './exercise';
import type { NewProgramInput } from './program';
import type { NewBlockInput } from './block';
import type { NewWorkoutDayInput } from './workout-day';
import type { NewPlannedExerciseInput } from './planned-exercise';

export type VolumeToleranceLevel = 'low' | 'medium' | 'high';

export type MixedPriority = 'strength' | 'look';

export interface GenerationAnswers {
  goal: ProgramGoal | null;
  frequencyDays: 3 | 4 | 5 | 6 | null;
  level: TrainingLevel | null;
  equipment: EquipmentType | null;
  injuries: string;
  avoidExercises: string;
  priorityMuscles: string[];
  sportsParallel: string;
  maxSessionDurationMin: 45 | 60 | 75 | 90 | null;
  mixedPriority: MixedPriority | null;
  volumeTolerance: VolumeToleranceLevel | null;
  importHistory: boolean;
  weightKg: string;
  heightCm: string;
  readinessAvg: 1 | 2 | 3 | 4 | 5 | null;
  attendancePercent: 60 | 70 | 80 | 90 | 100 | null;
}

export const GENERATION_STEP_COUNT = 8;

export const PRIORITY_MUSCLE_OPTIONS = [
  'Pectoraux',
  'Dos',
  'Épaules',
  'Biceps',
  'Triceps',
  'Quadriceps',
  'Ischio-jambiers',
  'Fessiers',
  'Mollets',
  'Abdominaux',
] as const;

export type GenerationHistoryEntry = {
  exerciseId: string;
  load: number;
  reps: number;
  rir: number | null;
  performedAt: string;
};

export type GenerationSplitKind =
  | 'full_body_ab'
  | 'full_body_abc'
  | 'upper_lower'
  | 'upper_lower_upper_focus'
  | 'push_pull_legs'
  | 'push_pull_legs_upper_lower'
  | 'push_pull_legs_x2';

export type GenerationInput = {
  userId: string;
  answers: GenerationAnswers;
  catalogue: Exercise[];
  history?: GenerationHistoryEntry[];
  now?: Date;
};

export type GenerationWarning = {
  code:
    | 'fallback_level'
    | 'missing_main'
    | 'missing_secondary'
    | 'missing_accessory'
    | 'catalogue_thin'
    | 'ignored_sport_keyword';
  message: string;
  context?: Record<string, unknown>;
};

export type GenerationDayDraft = {
  day: NewWorkoutDayInput;
  plannedExercises: NewPlannedExerciseInput[];
};

export type GenerationResult = {
  program: NewProgramInput;
  block: NewBlockInput;
  days: GenerationDayDraft[];
  split: GenerationSplitKind;
  warnings: GenerationWarning[];
};
