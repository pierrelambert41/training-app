import { useQuery } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { getCompletedSessionsForWeek } from '@/services/sessions';
import type { Block } from '@/types/block';
import type { WorkoutDay } from '@/types/workout-day';
import {
  computeWeekProgress,
  weekStartFor,
  type WeekProgress,
} from '@/lib/week-progress';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Progression d'une semaine du bloc (TA-155) : état par jour + compteur
 * x/y séances. `weekNumber` = semaine affichée (peut différer de la semaine
 * réelle du bloc quand l'utilisateur navigue dans le calendrier).
 * Null tant que le bloc ou la requête n'est pas disponible.
 */
export function useWeekProgress(
  block: Block | null,
  workoutDays: WorkoutDay[],
  weekNumber: number
): WeekProgress | null {
  const db = useDB();
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = block
    ? weekStartFor(block.startDate, weekNumber, today)
    : null;
  const weekEnd = weekStart
    ? new Date(new Date(`${weekStart}T00:00:00.000Z`).getTime() + 6 * DAY_MS)
        .toISOString()
        .slice(0, 10)
    : null;

  const query = useQuery({
    queryKey: ['block-week-progress', block?.id, weekStart],
    queryFn: () =>
      getCompletedSessionsForWeek(db, block!.id, weekStart!, weekEnd!),
    enabled: !!block && !!weekStart,
  });

  if (!block || !weekStart || !query.data) return null;

  return computeWeekProgress(workoutDays, query.data, weekStart, today);
}
