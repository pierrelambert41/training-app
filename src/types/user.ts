export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export type TrainingLevel = 'beginner' | 'intermediate' | 'advanced';
export type PreferredUnit = 'kg' | 'lb';
export type PrimaryGoal = 'hypertrophy' | 'strength' | 'mixed';
export type EquipmentType = 'full_gym' | 'home' | 'minimal';

export interface UserProfile {
  id: string;
  userId: string;
  displayName: string | null;
  heightCm: number | null;
  preferredUnit: PreferredUnit;
  trainingLevel: TrainingLevel;
  goals: {
    primary: PrimaryGoal;
    secondary?: PrimaryGoal;
  };
  constraints: {
    injuries: string[];
    avoidExercises: string[];
  };
  equipment: {
    type: EquipmentType;
    items: string[];
  };
  sportsParallel: string[];
  createdAt: string;
  updatedAt: string;
}
