export interface SetLog {
  id: string;
  sessionId: string;
  plannedExerciseId: string;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  rir: number | null;
  rpe: number | null;
  completedAt: string;
}

export type SessionStatus = 'in_progress' | 'completed' | 'skipped';

export interface Session {
  id: string;
  userId: string;
  workoutDayId: string;
  status: SessionStatus;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
  setLogs: SetLog[];
  syncedAt: string | null;
}
