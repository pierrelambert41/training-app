import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDB } from './use-db';
import { getActiveProgramForUser } from '@/services/programs';
import { getBlocksByStatus } from '@/services/blocks';
import { getWorkoutDaysByBlockId } from '@/services/workout-days';
import { getSessionCountsByBlockId } from '@/services/sessions';
import { useActiveProgramStore } from '@/stores/active-program-store';
import { useAuthStore } from '@/stores/auth-store';

async function fetchActiveProgram(
  db: Parameters<typeof getActiveProgramForUser>[0],
  userId: string
) {
  const program = await getActiveProgramForUser(db, userId);
  console.log('[useActiveProgram] userId:', userId, '→ program:', program?.id ?? 'null', 'isActive:', program?.isActive);
  if (!program) return { program: null, activeBlock: null, workoutDays: [], sessionCountsByDayId: {} };

  const activeBlocks = await getBlocksByStatus(db, program.id, 'active');
  const activeBlock = activeBlocks[0] ?? null;

  if (!activeBlock) {
    return { program, activeBlock: null, workoutDays: [], sessionCountsByDayId: {} };
  }

  const workoutDays = await getWorkoutDaysByBlockId(db, activeBlock.id);
  const sessionCountsByDayId = await getSessionCountsByBlockId(db, activeBlock.id);

  return { program, activeBlock, workoutDays, sessionCountsByDayId };
}

export function useActiveProgram() {
  const db = useDB();
  const userId = useAuthStore((s) => s.user?.id);
  const setProgram = useActiveProgramStore((s) => s.setProgram);
  const setActiveBlock = useActiveProgramStore((s) => s.setActiveBlock);
  const setWorkoutDays = useActiveProgramStore((s) => s.setWorkoutDays);
  const setSessionCounts = useActiveProgramStore((s) => s.setSessionCounts);

  const query = useQuery({
    queryKey: ['active-program', userId],
    queryFn: () => fetchActiveProgram(db, userId!),
    enabled: !!userId,
  });

  useEffect(() => {
    if (query.data) {
      setProgram(query.data.program);
      setActiveBlock(query.data.activeBlock);
      setWorkoutDays(query.data.workoutDays);
      setSessionCounts(query.data.sessionCountsByDayId);
    }
  }, [query.data, setProgram, setActiveBlock, setWorkoutDays, setSessionCounts]);

  return query;
}
