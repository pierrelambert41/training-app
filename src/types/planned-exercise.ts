export type ProgressionType =
  | 'strength_fixed'
  | 'double_progression'
  | 'accessory_linear'
  | 'bodyweight_progression'
  | 'duration_progression'
  | 'distance_duration';

export type PlannedExerciseRole = 'main' | 'secondary' | 'accessory';

export interface StrengthFixedConfig {
  increment_upper_kg: number;
  increment_lower_kg: number;
  rir_threshold_increase: number;
  failures_before_reset: number;
  reset_delta_kg: number;
}

export interface DoubleProgressionConfig {
  increment_kg: number;
  min_reps: number;
  max_reps: number;
  all_sets_at_max_to_increase: boolean;
  regressions_before_alert: number;
}

export interface AccessoryLinearConfig {
  increment_kg: number;
  min_reps: number;
  max_reps: number;
  all_sets_at_max_to_increase: boolean;
}

export interface BodyweightProgressionConfig {
  increment_kg: number;
  min_reps: number;
  max_reps: number;
}

export interface DurationProgressionConfig {
  increment_seconds: number;
  target_seconds: number;
}

export interface DistanceDurationConfig {
  target_distance_meters?: number;
  target_duration_seconds?: number;
}

export type ProgressionConfig =
  | StrengthFixedConfig
  | DoubleProgressionConfig
  | AccessoryLinearConfig
  | BodyweightProgressionConfig
  | DurationProgressionConfig
  | DistanceDurationConfig
  | Record<string, unknown>;

export interface PlannedExercise {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  exerciseOrder: number;
  role: PlannedExerciseRole;
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRir: number | null;
  restSeconds: number | null;
  tempo: string | null;
  progressionType: ProgressionType;
  progressionConfig: ProgressionConfig;
  notes: string | null;
  createdAt: string;
}

export type NewPlannedExerciseInput = {
  id: string;
  workoutDayId: string;
  exerciseId: string;
  exerciseOrder: number;
  role: PlannedExerciseRole;
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRir?: number | null;
  restSeconds?: number | null;
  tempo?: string | null;
  progressionType: ProgressionType;
  progressionConfig: ProgressionConfig;
  notes?: string | null;
};

export type UpdatePlannedExerciseInput = Partial<
  Pick<
    PlannedExercise,
    | 'exerciseOrder'
    | 'role'
    | 'sets'
    | 'repRangeMin'
    | 'repRangeMax'
    | 'targetRir'
    | 'restSeconds'
    | 'tempo'
    | 'progressionType'
    | 'progressionConfig'
    | 'notes'
  >
>;
