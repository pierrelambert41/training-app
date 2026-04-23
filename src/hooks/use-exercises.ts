import { useQuery } from '@tanstack/react-query';
import { useDB } from './use-db';
import { searchExercises } from '@/services/exercises';

export function useExercises(searchQuery: string) {
  const db = useDB();

  return useQuery({
    queryKey: ['exercises', searchQuery],
    queryFn: () => searchExercises(db, searchQuery),
    staleTime: 5 * 60 * 1000,
  });
}
