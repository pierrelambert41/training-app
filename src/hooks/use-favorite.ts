import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDB } from './use-db';
import { getExerciseFavorite, toggleExerciseFavorite } from '@/services/favorites';

export function useFavorite(exerciseId: string) {
  const db = useDB();
  const queryClient = useQueryClient();

  const { data: isFavorite = false } = useQuery({
    queryKey: ['favorite', exerciseId],
    queryFn: () => getExerciseFavorite(db, exerciseId),
  });

  const { mutate: toggle, isPending } = useMutation({
    mutationFn: () => toggleExerciseFavorite(db, exerciseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite', exerciseId] });
    },
  });

  return { isFavorite, toggle, isPending };
}
