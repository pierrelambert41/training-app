export type ExerciseSessionHistory = {
  sessionId: string;
  date: string;
  bestSet: {
    load: number | null;
    reps: number | null;
    rir: number | null;
  };
};
