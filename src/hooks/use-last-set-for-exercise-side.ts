import { useEffect, useState } from 'react';
import type { SetLog, SetLogSide } from '@/types';
import { getLastSetLogForExerciseBySide } from '@/services/set-logs';
import { useDB } from './use-db';

type Result = {
  lastSetLeft: SetLog | null;
  lastSetRight: SetLog | null;
  loading: boolean;
};

export function useLastSetForExerciseSide(
  exerciseId: string | null,
  excludeSessionId?: string
): Result {
  const db = useDB();
  const [lastSetLeft, setLastSetLeft] = useState<SetLog | null>(null);
  const [lastSetRight, setLastSetRight] = useState<SetLog | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!exerciseId) {
      setLastSetLeft(null);
      setLastSetRight(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      getLastSetLogForExerciseBySide(db, exerciseId, 'left', excludeSessionId),
      getLastSetLogForExerciseBySide(db, exerciseId, 'right', excludeSessionId),
    ])
      .then(([left, right]) => {
        if (!cancelled) {
          setLastSetLeft(left);
          setLastSetRight(right);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLastSetLeft(null);
          setLastSetRight(null);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [db, exerciseId, excludeSessionId]);

  return { lastSetLeft, lastSetRight, loading };
}
