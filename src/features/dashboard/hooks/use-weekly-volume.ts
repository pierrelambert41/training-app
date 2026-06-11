import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { useAuthStore } from '@/features/auth';
import { weekBounds } from '../domain/weekly-volume';
import { getWeeklyVolumeByMuscle } from '../api/weekly-volume-service';

/**
 * Volume hebdo par muscle avec navigation de semaine (offset 0 = semaine
 * courante, négatif = passé ; le futur est verrouillé par le composant).
 */
export function useWeeklyVolume() {
  const db = useDB();
  const userId = useAuthStore((s) => s.user?.id);
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date().toISOString().slice(0, 10);
  const bounds = weekBounds(today, weekOffset);

  const query = useQuery({
    queryKey: ['dashboard-weekly-volume', userId, bounds.start],
    queryFn: () => getWeeklyVolumeByMuscle(db, userId!, bounds.start, bounds.end),
    enabled: !!userId,
  });

  return {
    volumes: query.data ?? [],
    isLoading: query.isLoading,
    weekStart: bounds.start,
    weekOffset,
    goToPreviousWeek: () => setWeekOffset((o) => o - 1),
    goToNextWeek: () => setWeekOffset((o) => Math.min(0, o + 1)),
  };
}
