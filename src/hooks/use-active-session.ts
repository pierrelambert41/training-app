import { useEffect } from 'react';
import { useDB } from './use-db';
import { useAuthStore } from '@/stores/auth-store';
import {
  useSessionStore,
  lookupInProgressSessionForToday,
} from '@/stores/session-store';

export function useActiveSession() {
  const db = useDB();
  const userId = useAuthStore((s) => s.user?.id);
  const session = useSessionStore((s) => s.session);
  const resumeSession = useSessionStore((s) => s.resumeSession);

  useEffect(() => {
    if (!userId || session !== null) return;

    let cancelled = false;

    async function tryResume() {
      const sessionId = await lookupInProgressSessionForToday(db, userId!);
      if (cancelled || !sessionId) return;
      await resumeSession(db, sessionId);
    }

    tryResume();

    return () => {
      cancelled = true;
    };
  }, [db, userId, session, resumeSession]);
}
