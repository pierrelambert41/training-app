import { useCallback } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { generateAndStoreSessionSummary } from '@/features/ai';
import { supabase } from '@/services/supabase';

/**
 * Hook partagé qui expose `triggerSessionSummary` :
 * - fire-and-forget : ne jamais await dans le chemin critique UI
 * - désactivable via EXPO_PUBLIC_AI_ENABLED=false
 * - erreur loguée en console uniquement, ne propage jamais vers l'appelant
 *
 * Placé dans src/hooks/ (shared-hooks) pour respecter ESLint boundaries :
 * feature-hooks/session ne peut pas importer feature-index/ai ni @/services/supabase.
 * Cf. pitfall SYNC-01 et AI-05.
 */
export function useSessionSummaryTrigger(db: SQLiteDatabase) {
  const triggerSessionSummary = useCallback(
    (sessionId: string, userId: string): void => {
      if (process.env.EXPO_PUBLIC_AI_ENABLED === 'false') return;

      generateAndStoreSessionSummary(db, sessionId, userId, supabase).catch(
        (e: unknown) => {
          console.error('[ai] generateAndStoreSessionSummary failed', e);
        }
      );
    },
    [db]
  );

  return { triggerSessionSummary };
}
