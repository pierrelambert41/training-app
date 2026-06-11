import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { useDB } from '@/hooks/use-db';
import {
  getTonnageHistory,
  getTonnageWorkoutDays,
} from '../api/tonnage-history-service';

/**
 * Évolution du tonnage par séance type (workout day) sur 90 jours.
 * Sélection par défaut : le jour le plus pratiqué.
 */
export function useTonnageHistory() {
  const db = useDB();
  const userId = useAuthStore((s) => s.user?.id);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const daysQuery = useQuery({
    queryKey: ['tonnage-workout-days', userId],
    queryFn: () => getTonnageWorkoutDays(db, userId!),
    enabled: !!userId,
  });

  const workoutDays = daysQuery.data ?? [];

  useEffect(() => {
    if (selectedDayId === null && workoutDays.length > 0) {
      setSelectedDayId(workoutDays[0]!.id);
    }
  }, [selectedDayId, workoutDays]);

  const historyQuery = useQuery({
    queryKey: ['tonnage-history', userId, selectedDayId],
    queryFn: () => getTonnageHistory(db, userId!, selectedDayId!),
    enabled: !!userId && selectedDayId !== null,
  });

  return {
    workoutDays,
    selectedDayId,
    selectDay: setSelectedDayId,
    points: historyQuery.data ?? [],
  };
}
