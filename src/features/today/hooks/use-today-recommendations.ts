import { useQuery } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { useAuthStore } from '@/features/auth';
import { getTodayRecommendations } from '../api/get-today-recommendations';

export function useTodayRecommendations() {
  const db = useDB();
  const userId = useAuthStore((s) => s.user?.id);

  return useQuery({
    queryKey: ['today-recommendations', userId],
    queryFn: () => getTodayRecommendations(db, userId!),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
