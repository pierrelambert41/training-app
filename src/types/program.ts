import type { TrainingLevel } from './user';

export type ProgramGoal = 'hypertrophy' | 'strength' | 'mixed';

export interface Program {
  id: string;
  userId: string;
  title: string;
  goal: ProgramGoal;
  frequency: number | null;
  level: TrainingLevel | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type NewProgramInput = {
  id: string;
  userId: string;
  title: string;
  goal: ProgramGoal;
  frequency: number | null;
  level: TrainingLevel | null;
  isActive?: boolean;
};

export type UpdateProgramInput = Partial<
  Pick<Program, 'title' | 'goal' | 'frequency' | 'level' | 'isActive'>
>;
