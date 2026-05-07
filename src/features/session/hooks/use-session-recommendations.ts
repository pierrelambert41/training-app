import { useQuery } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { getRecommendationsBySession } from '@/services/recommendations';
import type { Recommendation } from '@/types';

export function useSessionRecommendations(sessionId: string | null) {
  const db = useDB();

  return useQuery<Recommendation[]>({
    queryKey: ['session-recommendations', sessionId],
    queryFn: () => getRecommendationsBySession(db, sessionId!),
    enabled: !!sessionId,
    staleTime: Infinity,
  });
}
