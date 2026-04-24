export type SplitType = 'push' | 'pull' | 'legs' | 'upper' | 'lower' | 'full';

export interface WorkoutDay {
  id: string;
  blockId: string;
  title: string;
  dayOrder: number;
  splitType: SplitType | null;
  estimatedDurationMin: number | null;
  createdAt: string;
}

export type NewWorkoutDayInput = {
  id: string;
  blockId: string;
  title: string;
  dayOrder: number;
  splitType?: SplitType | null;
  estimatedDurationMin?: number | null;
};

export type UpdateWorkoutDayInput = Partial<
  Pick<WorkoutDay, 'title' | 'dayOrder' | 'splitType' | 'estimatedDurationMin'>
>;
