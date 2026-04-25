import { useEffect, useState } from 'react';
import type { SetLog } from '@/types';
import { getLastSetLogForExercise } from '@/services/set-logs';
import { useDB } from './use-db';

type Result = {
  lastSet: SetLog | null;
  loading: boolean;
};

export function useLastSetForExercise(
  exerciseId: string | null,
  excludeSessionId?: string
): Result {
  const db = useDB();
  const [lastSet, setLastSet] = useState<SetLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!exerciseId) {
      setLastSet(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getLastSetLogForExercise(db, exerciseId, excludeSessionId)
      .then((set) => {
        if (!cancelled) {
          setLastSet(set);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLastSet(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [db, exerciseId, excludeSessionId]);

  return { lastSet, loading };
}
