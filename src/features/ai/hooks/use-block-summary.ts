import { useQuery } from '@tanstack/react-query';
import type { SQLiteDatabase } from 'expo-sqlite';
import { generateBlockSummary } from '../api/block-summary-service';
import { supabase } from '@/services/supabase';

type UseBlockSummaryOptions = {
  db: SQLiteDatabase;
  blockId: string;
  userId: string;
};

/**
 * Hook TanStack Query pour générer à la demande la synthèse IA d'un bloc terminé.
 *
 * `enabled: false` — la query ne s'exécute pas automatiquement.
 * Appeler `generate()` pour déclencher la synthèse (fire-on-demand).
 *
 * Une seule analyse IA par bloc : le service retourne le résumé en cache
 * (Recommendation type 'summary' avec metadata.block_id) si déjà généré.
 *
 * Cf. docs/ai-strategy.md §2 (résumé de bloc, à la demande) et §4 (pipeline synthèse bloc).
 */
export function useBlockSummary({ db, blockId, userId }: UseBlockSummaryOptions) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['block-summary', blockId, userId],
    queryFn: () => generateBlockSummary(db, blockId, userId, supabase),
    enabled: false,
    staleTime: Infinity,
    retry: false,
  });

  return {
    summary: data ?? null,
    isLoading,
    error,
    generate: refetch,
  };
}
