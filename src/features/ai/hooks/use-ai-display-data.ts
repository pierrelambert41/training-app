import { useQuery } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { getAIContextProfile } from '../api/ai-context-service';
import {
  getLatestSessionSummary,
  getStoredBlockSummary,
} from '../api/summary-display-service';
import type { LatestSessionSummary } from '../api/summary-display-service';
import type { BlockSummary } from '../types/ai-responses';

/**
 * Hooks de lecture pour les composants d'affichage IA (TA-140).
 * Lecture seule depuis SQLite — pas d'appel réseau, pas d'import supabase.
 */

/** Dernier résumé IA de séance pour l'écran Aujourd'hui. */
export function useLatestSessionSummary(userId: string | undefined) {
  const db = useDB();
  const { data } = useQuery<LatestSessionSummary | null>({
    queryKey: ['latest-session-ai-summary', userId],
    queryFn: () => getLatestSessionSummary(db, userId!),
    enabled: !!userId,
    staleTime: 60_000,
  });
  return { latest: data ?? null };
}

/** Résumé IA persisté d'un bloc pour la vue bloc courant. */
export function useStoredBlockSummary(blockId: string | undefined) {
  const db = useDB();
  const { data } = useQuery<BlockSummary | null>({
    queryKey: ['stored-block-summary', blockId],
    queryFn: () => getStoredBlockSummary(db, blockId!),
    enabled: !!blockId,
    staleTime: 60_000,
  });
  return { summary: data ?? null };
}

/** recent_highlights de l'AIContextProfile pour les AIInsightBadge. */
export function useAIHighlights(userId: string | undefined) {
  const db = useDB();
  const { data } = useQuery<string[]>({
    queryKey: ['ai-highlights', userId],
    queryFn: async () => {
      const profile = await getAIContextProfile(db, userId!);
      return profile?.recent_highlights ?? [];
    },
    enabled: !!userId,
    staleTime: 60_000,
  });
  return { highlights: data ?? [] };
}
