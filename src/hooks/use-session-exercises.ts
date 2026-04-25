import { useQuery } from '@tanstack/react-query';
import { useDB } from './use-db';
import { getExercisesByIds } from '@/services/exercises';
import { getWorkoutDayById } from '@/services/workout-days';
import type { Exercise } from '@/types';
import type { PlannedExercise } from '@/types/planned-exercise';
import type { WorkoutDay } from '@/types/workout-day';

type SessionExercisesResult = {
  exercisesById: Map<string, Exercise>;
  workoutDay: WorkoutDay | null;
};

export function useSessionExercises(
  plannedExercises: PlannedExercise[],
  workoutDayId: string | null
) {
  const db = useDB();
  const exerciseIds = plannedExercises.map((pe) => pe.exerciseId);
  const cacheKey = exerciseIds.join(',');

  return useQuery<SessionExercisesResult>({
    queryKey: ['session-exercises', cacheKey, workoutDayId],
    queryFn: async (): Promise<SessionExercisesResult> => {
      const [exercises, workoutDay] = await Promise.all([
        exerciseIds.length > 0 ? getExercisesByIds(db, exerciseIds) : Promise.resolve([]),
        workoutDayId ? getWorkoutDayById(db, workoutDayId) : Promise.resolve(null),
      ]);

      return {
        exercisesById: new Map(exercises.map((e) => [e.id, e])),
        workoutDay: workoutDay ?? null,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
