import type { WorkoutDay } from '@/types/workout-day';

export type NextWorkoutDay = {
  title: string;
  dayOrder: number;
};

const FRENCH_DAY_NAMES: Record<number, string> = {
  1: 'lundi',
  2: 'mardi',
  3: 'mercredi',
  4: 'jeudi',
  5: 'vendredi',
  6: 'samedi',
  7: 'dimanche',
};

export function dayOrderToFrenchName(dayOrder: number): string {
  return FRENCH_DAY_NAMES[dayOrder] ?? '';
}

export function getNextWorkoutDay(
  workoutDays: WorkoutDay[],
  todayDayOrder: number
): NextWorkoutDay | null {
  if (workoutDays.length === 0) return null;

  const sorted = [...workoutDays].sort((a, b) => a.dayOrder - b.dayOrder);

  const next = sorted.find((d) => d.dayOrder > todayDayOrder);
  if (next) return { title: next.title, dayOrder: next.dayOrder };

  return { title: sorted[0].title, dayOrder: sorted[0].dayOrder };
}
