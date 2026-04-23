import { useQuery } from '@tanstack/react-query';
import { useDB } from './use-db';
import { getExerciseById, getExercisesByIds } from '@/services/exercises';
import type { Exercise } from '@/types';

type ExerciseDetail = {
  exercise: Exercise;
  alternatives: Exercise[];
};

export function useExerciseDetail(id: string) {
  const db = useDB();

  return useQuery({
    queryKey: ['exercise', id],
    queryFn: async (): Promise<ExerciseDetail | null> => {
      const exercise = await getExerciseById(db, id);
      if (!exercise) return null;

      const alternatives = await getExercisesByIds(db, exercise.alternatives);
      return { exercise, alternatives };
    },
    staleTime: 5 * 60 * 1000,
    enabled: id.length > 0,
  });
}
