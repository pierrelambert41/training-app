import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { useSessionStore } from '@/stores/session-store';
import { runRulesEngine } from '@/features/progression';
import type { RulesEngineResult } from '@/features/progression';

type CompleteSessionState = 'idle' | 'completing' | 'completed';

export function useCompleteSession() {
  const db = useDB();
  const queryClient = useQueryClient();
  const completeSession = useSessionStore((s) => s.completeSession);
  const updateSessionNotes = useSessionStore((s) => s.updateSessionNotes);
  const session = useSessionStore((s) => s.session);

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
          await queryClient.invalidateQueries({
            queryKey: ['session-recommendations', sessionId],
          });
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
    [db, session, completeSession, updateSessionNotes, queryClient]
  );

  return { complete, state, rulesResult, isCompleting: state === 'completing', isCompleted: state === 'completed' };
}
