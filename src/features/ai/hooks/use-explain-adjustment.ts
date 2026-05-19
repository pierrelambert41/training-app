import { useQuery } from '@tanstack/react-query';
import type { SQLiteDatabase } from 'expo-sqlite';
import { explainAdjustment } from '../api/explain-adjustment-service';
import { supabase } from '@/services/supabase';

type UseExplainAdjustmentOptions = {
  db: SQLiteDatabase;
  recommendationId: string;
  userId: string;
};

/**
 * Hook TanStack Query pour déclencher à la demande l'explication IA d'un ajustement.
 *
 * `enabled: false` — la query ne s'exécute pas automatiquement.
 * Appeler `explain()` pour déclencher l'explication (fire-on-demand).
 *
 * Cf. docs/ai-strategy.md §2 (déclenchement à la demande, coût tokens).
 * Consommé dans l'écran fin de séance et potentiellement écran Aujourd'hui (tickets UI dédiés).
 */
export function useExplainAdjustment({
  db,
  recommendationId,
  userId,
}: UseExplainAdjustmentOptions) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['explain-adjustment', recommendationId],
    queryFn: () => explainAdjustment(db, recommendationId, userId, supabase),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });

  return {
    explanation: data ?? null,
    isLoading,
    error,
    explain: refetch,
  };
}
