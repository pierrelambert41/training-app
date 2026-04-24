import { create } from 'zustand';
import type { Program } from '@/types/program';
import type { Block } from '@/types/block';
import type { WorkoutDay } from '@/types/workout-day';

interface ActiveProgramState {
  program: Program | null;
  activeBlock: Block | null;
  workoutDays: WorkoutDay[];
  sessionCountsByDayId: Record<string, number>;
  setProgram: (program: Program | null) => void;
  setActiveBlock: (block: Block | null) => void;
  setWorkoutDays: (days: WorkoutDay[]) => void;
  setSessionCounts: (counts: Record<string, number>) => void;
  reset: () => void;
}

export const useActiveProgramStore = create<ActiveProgramState>((set) => ({
  program: null,
  activeBlock: null,
  workoutDays: [],
  sessionCountsByDayId: {},
  setProgram: (program) => set({ program }),
  setActiveBlock: (activeBlock) => set({ activeBlock }),
  setWorkoutDays: (workoutDays) => set({ workoutDays }),
  setSessionCounts: (sessionCountsByDayId) => set({ sessionCountsByDayId }),
  reset: () =>
    set({
      program: null,
      activeBlock: null,
      workoutDays: [],
      sessionCountsByDayId: {},
    }),
}));
