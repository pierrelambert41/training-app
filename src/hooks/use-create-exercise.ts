import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDB } from './use-db';
import { insertCustomExercise, type CustomExerciseInput } from '@/services/exercises';

export function useCreateExercise() {
  const db = useDB();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CustomExerciseInput) => insertCustomExercise(db, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}
