import { useRef, useCallback } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { refreshAIContextProfile } from '@/features/ai';

/**
 * Hook partagé qui expose `triggerAIContextRefresh` :
 * - fire-and-forget : ne jamais await dans le chemin critique UI
 * - guard : si un refresh est déjà en cours, le suivant est ignoré
 * - désactivable via EXPO_PUBLIC_AI_ENABLED=false
 * - erreur loguée en console uniquement, ne propage jamais vers l'appelant
 */
export function useAIContextRefresh(db: SQLiteDatabase) {
  const isRefreshing = useRef(false);

  const triggerAIContextRefresh = useCallback(
    (userId: string): void => {
      if (process.env.EXPO_PUBLIC_AI_ENABLED === 'false') return;
      if (isRefreshing.current) return;

      isRefreshing.current = true;
      try {
        const promise = refreshAIContextProfile(db, userId);
        promise
          .catch((e: unknown) => {
            console.error('[ai] refreshAIContextProfile failed', e);
          })
          .finally(() => {
            isRefreshing.current = false;
          });
      } catch (e: unknown) {
        console.error('[ai] refreshAIContextProfile failed', e);
        isRefreshing.current = false;
      }
    },
    [db]
  );

  return { triggerAIContextRefresh };
}
