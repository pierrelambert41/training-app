import { useQuery } from '@tanstack/react-query';
import { useDB } from './use-db';
import { getWorkoutDayById } from '@/services/workout-days';
import { getPlannedExercisesByWorkoutDayId } from '@/services/planned-exercises';
import { getExercisesByIds } from '@/services/exercises';
import type { WorkoutDay } from '@/types/workout-day';
import type { PlannedExercise } from '@/types/planned-exercise';
import type { Exercise } from '@/types/exercise';

export type PlannedExerciseWithExercise = PlannedExercise & {
  exercise: Exercise;
};

export type WorkoutDayDetail = {
  day: WorkoutDay;
  plannedExercises: PlannedExerciseWithExercise[];
};

export function useWorkoutDayDetail(workoutDayId: string) {
  const db = useDB();

  return useQuery({
    queryKey: ['workout-day-detail', workoutDayId],
    queryFn: async (): Promise<WorkoutDayDetail | null> => {
      const day = await getWorkoutDayById(db, workoutDayId);
      if (!day) return null;

      const plannedExercises = await getPlannedExercisesByWorkoutDayId(db, workoutDayId);

      const exerciseIds = plannedExercises.map((pe) => pe.exerciseId);
      const exercises = await getExercisesByIds(db, exerciseIds);
      const exercisesById = new Map(exercises.map((e) => [e.id, e]));

      const plannedExercisesWithExercise: PlannedExerciseWithExercise[] = plannedExercises.flatMap(
        (pe) => {
          const exercise = exercisesById.get(pe.exerciseId);
          if (!exercise) return [];
          return [{ ...pe, exercise }];
        }
      );

      return { day, plannedExercises: plannedExercisesWithExercise };
    },
    staleTime: 2 * 60 * 1000,
    enabled: workoutDayId.length > 0,
  });
}
