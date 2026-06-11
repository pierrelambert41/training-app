import type { TrainingLevel } from './user';

export type ProgramGoal = 'hypertrophy' | 'strength' | 'mixed';

/** Source de génération (TA-146) — NULL pour les programmes antérieurs. */
export type GenerationSource = 'ai' | 'fallback';

export interface Program {
  id: string;
  userId: string;
  title: string;
  goal: ProgramGoal;
  frequency: number | null;
  level: TrainingLevel | null;
  isActive: boolean;
  generationSource: GenerationSource | null;
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
  generationSource?: GenerationSource | null;
};

export type UpdateProgramInput = Partial<
  Pick<Program, 'title' | 'goal' | 'frequency' | 'level' | 'isActive' | 'generationSource'>
>;
