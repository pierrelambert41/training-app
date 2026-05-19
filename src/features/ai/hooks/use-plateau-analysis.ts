import { useQuery } from '@tanstack/react-query';
import type { SQLiteDatabase } from 'expo-sqlite';
import { analyzePlateau } from '../api/plateau-analysis-service';
import { supabase } from '@/services/supabase';

type UsePlateauAnalysisOptions = {
  db: SQLiteDatabase;
  exerciseId: string;
  userId: string;
};

/**
 * Hook TanStack Query pour déclencher à la demande l'analyse IA d'un plateau.
 *
 * `enabled: false` — la query ne s'exécute pas automatiquement.
 * Appeler `analyze()` pour déclencher l'analyse (fire-on-demand, basse priorité).
 *
 * La PlateauAnalysis est persistée comme Recommendation type 'plateau' dans SQLite
 * et retournée directement dans `analysis`.
 *
 * Cf. docs/ai-strategy.md §2 (déclenchement à la demande) et §4.2 (pipeline plateau).
 */
export function usePlateauAnalysis({ db, exerciseId, userId }: UsePlateauAnalysisOptions) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['plateau-analysis', exerciseId, userId],
    queryFn: () => analyzePlateau(db, exerciseId, userId, supabase),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });

  return {
    analysis: data ?? null,
    isLoading,
    error,
    analyze: refetch,
  };
}
