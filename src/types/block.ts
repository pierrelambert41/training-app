export type BlockGoal = 'hypertrophy' | 'strength' | 'peaking' | 'deload';

export type BlockStatus = 'planned' | 'active' | 'deloaded' | 'completed';

export type DeloadStrategy = 'scheduled' | 'fatigue_triggered' | 'none';

export interface Block {
  id: string;
  programId: string;
  title: string;
  goal: BlockGoal;
  durationWeeks: number;
  weekNumber: number;
  startDate: string | null;
  endDate: string | null;
  status: BlockStatus;
  deloadStrategy: DeloadStrategy;
  /** Source de génération (TA-146) — NULL pour les blocs antérieurs. */
  generationSource: 'ai' | 'fallback' | null;
  createdAt: string;
  updatedAt: string;
}

export type NewBlockInput = {
  id: string;
  programId: string;
  title: string;
  goal: BlockGoal;
  durationWeeks: number;
  weekNumber?: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: BlockStatus;
  deloadStrategy?: DeloadStrategy;
  generationSource?: 'ai' | 'fallback' | null;
};

export type UpdateBlockInput = Partial<
  Pick<
    Block,
    | 'title'
    | 'goal'
    | 'durationWeeks'
    | 'weekNumber'
    | 'startDate'
    | 'endDate'
    | 'status'
    | 'deloadStrategy'
  >
>;
