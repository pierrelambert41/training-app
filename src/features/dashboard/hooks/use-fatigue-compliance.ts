import { useQuery } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { useAuthStore } from '@/features/auth';
import { useActiveProgramStore } from '@/stores/active-program-store';
import { computeCompliance, type Compliance } from '../domain/compliance';
import {
  getCompletedSessionDates,
  getFatigueHistory,
} from '../api/fatigue-compliance-service';

/**
 * Courbe de fatigue (60 jours) + compliance du bloc actif. La compliance est
 * null sans bloc actif daté ou bloc fraîchement démarré.
 */
export function useFatigueCompliance() {
  const db = useDB();
  const userId = useAuthStore((s) => s.user?.id);
  const activeBlock = useActiveProgramStore((s) => s.activeBlock);
  const workoutDays = useActiveProgramStore((s) => s.workoutDays);

  const fatigueQuery = useQuery({
    queryKey: ['dashboard-fatigue-history', userId],
    queryFn: () => getFatigueHistory(db, userId!),
    enabled: !!userId,
  });

  const blockId = activeBlock?.id ?? null;
  const complianceQuery = useQuery({
    queryKey: ['dashboard-block-compliance', blockId],
    queryFn: () => getCompletedSessionDates(db, blockId!),
    enabled: !!blockId,
  });

  let compliance: Compliance | null = null;
  if (activeBlock?.startDate && complianceQuery.data) {
    compliance = computeCompliance({
      blockStartDate: activeBlock.startDate,
      durationWeeks: activeBlock.durationWeeks,
      workoutDaysPerWeek: workoutDays.length,
      completedDates: complianceQuery.data,
      today: new Date().toISOString().slice(0, 10),
    });
  }

  return {
    fatiguePoints: fatigueQuery.data ?? [],
    compliance,
    hasActiveBlock: !!activeBlock,
    isLoading: fatigueQuery.isLoading || complianceQuery.isLoading,
  };
}
