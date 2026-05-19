import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { useAIContextRefresh } from '@/hooks/use-ai-context-refresh';
import { useSessionStore } from '@/stores/session-store';
import { runRulesEngine } from '@/features/progression';
import type { RulesEngineResult } from '@/features/progression';

type CompleteSessionState = 'idle' | 'completing' | 'completed';

/**
 * userId passé en paramètre pour éviter l'import transitif de @/features/auth
 * (qui tire supabase.ts dans Jest et casse les tests des composants session).
 * L'appelant (end-session-screen) détient déjà userId via useAuthStore.
 * Cf. pitfall SYNC-01.
 */
export function useCompleteSession(userId: string | undefined) {
  const db = useDB();
  const queryClient = useQueryClient();
  const completeSession = useSessionStore((s) => s.completeSession);
  const updateSessionNotes = useSessionStore((s) => s.updateSessionNotes);
  const session = useSessionStore((s) => s.session);
  const { triggerAIContextRefresh } = useAIContextRefresh(db);

  const [state, setState] = useState<CompleteSessionState>('idle');
  const [rulesResult, setRulesResult] = useState<RulesEngineResult | null>(null);

  const complete = useCallback(
    async (sessionId: string, preNotes: string | null | undefined, postNotes: string) => {
      setState('completing');
      try {
        if (postNotes !== (session?.postSessionNotes ?? '')) {
          updateSessionNotes(db, preNotes ?? null, postNotes.trim() || null);
        }
        await completeSession(db);
        try {
          const result = await runRulesEngine(db, sessionId);
          setRulesResult(result);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['session-recommendations', sessionId] }),
            queryClient.invalidateQueries({ queryKey: ['today-workout'] }),
            queryClient.invalidateQueries({ queryKey: ['today-recommendations'] }),
          ]);
          if (userId) {
            triggerAIContextRefresh(userId);
          }
        } catch (e) {
          console.error('[session/end] runRulesEngine failed', e);
          setRulesResult(null);
        }
        setState('completed');
      } catch (e) {
        console.error('[session/end] completeSession failed', e);
        setState('idle');
        throw e;
      }
    },
    [db, session, completeSession, updateSessionNotes, queryClient, userId, triggerAIContextRefresh]
  );

  return { complete, state, rulesResult, isCompleting: state === 'completing', isCompleted: state === 'completed' };
}
