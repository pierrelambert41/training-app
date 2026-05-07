import type { WorkoutDay } from '@/types/workout-day';
import type { Session } from '@/types/session';

export type CompletedTodayData = {
  workoutDay: WorkoutDay;
  completedSession: Session;
  streak: number;
};
