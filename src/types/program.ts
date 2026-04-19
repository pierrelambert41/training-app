export type ProgressionType =
  | 'strength_fixed'
  | 'double_progression'
  | 'accessory_linear'
  | 'bodyweight_progression'
  | 'duration_progression';

export type LogType =
  | 'weight_reps'
  | 'bodyweight_reps'
  | 'duration'
  | 'distance_duration';

export type MovementPattern =
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'hinge'
  | 'squat'
  | 'unilateral_quad'
  | 'unilateral_hinge'
  | 'isolation_upper'
  | 'isolation_lower'
  | 'core'
  | 'carry';

export type ExerciseCategory =
  | 'compound'
  | 'isolation'
  | 'bodyweight'
  | 'machine'
  | 'cable';

export interface Exercise {
  id: string;
  name: string;
  nameFr: string | null;
  category: ExerciseCategory;
  movementPattern: MovementPattern;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string[];
  logType: LogType;
  isUnilateral: boolean;
  systemicFatigue: 'low' | 'moderate' | 'high';
  movementStability: 'stable' | 'moderate' | 'variable';
  morphoTags: string[];
  recommendedProgressionType: ProgressionType | null;
  alternatives: string[];
  coachingNotes: string | null;
  tags: string[];
  isCustom: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface PlannedExercise {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  order: number;
  sets: number;
  repMin: number;
  repMax: number;
  restSeconds: number;
  rirTarget: number | null;
  progressionType: ProgressionType;
  progressionConfig: Record<string, unknown>;
  notes: string | null;
}

export interface WorkoutDay {
  id: string;
  blockId: string;
  dayNumber: number;
  name: string;
  plannedExercises: PlannedExercise[];
}

export interface Block {
  id: string;
  programId: string;
  order: number;
  name: string;
  durationWeeks: number;
  goal: string;
  workoutDays: WorkoutDay[];
}

export interface Program {
  id: string;
  userId: string;
  name: string;
  isActive: boolean;
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}
