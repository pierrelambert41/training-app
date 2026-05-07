import { useQuery } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import {
  getExerciseHistory,
  getLatestLoadRecommendation,
  getLatestPlateauRecommendation,
} from '../api/exercise-history';
import type { ExerciseSessionHistory } from '../types/exercise-history';
import type { Recommendation } from '@/types';

type ExerciseHistoryData = {
  history: ExerciseSessionHistory[];
  latestLoadReco: Recommendation | null;
  latestPlateauReco: Recommendation | null;
};

export function useExerciseHistory(exerciseId: string) {
  const db = useDB();

  return useQuery({
    queryKey: ['exercise-history', exerciseId],
    queryFn: async (): Promise<ExerciseHistoryData> => {
      const [history, latestLoadReco, latestPlateauReco] = await Promise.all([
        getExerciseHistory(db, exerciseId),
        getLatestLoadRecommendation(db, exerciseId),
        getLatestPlateauRecommendation(db, exerciseId),
      ]);
      return { history, latestLoadReco, latestPlateauReco };
    },
    staleTime: 30 * 1000,
    enabled: exerciseId.length > 0,
  });
}
