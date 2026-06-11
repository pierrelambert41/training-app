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

export type SystemicFatigue = 'low' | 'moderate' | 'high';
export type MovementStability = 'stable' | 'moderate' | 'variable';

import type { ProgressionType } from './planned-exercise';

export type WeightUnit = 'kg' | 'lb';

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
  systemicFatigue: SystemicFatigue;
  movementStability: MovementStability;
  morphoTags: string[];
  recommendedProgressionType: ProgressionType | null;
  alternatives: string[];
  coachingNotes: string | null;
  tags: string[];
  isCustom: boolean;
  createdBy: string | null;
  createdAt: string;
  /** Override d'unité d'affichage (machine en lb). NULL = préférence globale. Stockage toujours en kg. */
  displayUnit?: WeightUnit | null;
  /** Poids de barre pour le plate calculator (kg). NULL = défaut 20 kg si equipment contient 'barbell'. */
  barWeightKg?: number | null;
  /** Fraction du poids du corps déplacée (tonnage bodyweight_reps). NULL = 1.0 par convention. */
  bodyweightFactor?: number | null;
}
