import type { WorkoutDay } from '@/types/workout-day';

/**
 * État d'un jour d'entraînement dans une semaine donnée (TA-155) :
 * - done     : une séance completed du bloc matche le workout_day sur la semaine
 * - today    : séance du jour, pas encore faite
 * - upcoming : à venir dans la semaine
 * - missed   : la date est passée sans séance complétée
 *
 * Pur (aucun I/O) — consommé par use-week-progress et l'écran bloc actif.
 */
export type WeekDayState = 'done' | 'today' | 'upcoming' | 'missed';

export type CompletedSessionRef = {
  workoutDayId: string | null;
  /** Date de la séance (YYYY-MM-DD). */
  date: string;
};

export type WeekProgress = {
  /** État par workout_day id. */
  stateByDayId: Record<string, WeekDayState>;
  doneCount: number;
  plannedCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/** Lundi (YYYY-MM-DD) de la semaine contenant la date donnée. */
export function mondayOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  const jsDay = d.getUTCDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  return new Date(d.getTime() + diffToMonday * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Lundi de la semaine n°`weekNumber` (1-indexée) d'un bloc démarrant à
 * `startDate`. Si startDate est null, retombe sur la semaine courante
 * (même convention que WeekCalendar).
 */
export function weekStartFor(
  startDate: string | null,
  weekNumber: number,
  today: string
): string {
  if (!startDate) return mondayOf(today);
  const blockMonday = mondayOf(startDate);
  const start = new Date(`${blockMonday}T00:00:00.000Z`);
  return new Date(start.getTime() + (weekNumber - 1) * 7 * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/**
 * Date planifiée d'un workout_day dans la semaine : lundi + (day_order - 1).
 * Aligné sur le placement des cellules de WeekCalendar (day_order 1 = lundi ;
 * un day_order 0 éventuel est décalé de +1 comme dans buildWeekCells).
 */
function plannedDateFor(
  day: WorkoutDay,
  weekStart: string,
  dayOrderOffset: number
): string {
  const start = new Date(`${weekStart}T00:00:00.000Z`);
  const index = day.dayOrder + dayOrderOffset - 1;
  return new Date(start.getTime() + index * DAY_MS).toISOString().slice(0, 10);
}

/**
 * Calcule l'état de chaque jour d'entraînement sur la semaine [weekStart,
 * weekStart+6]. Une séance compte si elle est completed, rattachée au
 * workout_day (id) et datée dans la semaine — peu importe le jour réel
 * (séance décalée = quand même faite).
 */
export function computeWeekProgress(
  workoutDays: WorkoutDay[],
  completedSessions: CompletedSessionRef[],
  weekStart: string,
  today: string
): WeekProgress {
  const weekEnd = new Date(
    new Date(`${weekStart}T00:00:00.000Z`).getTime() + 6 * DAY_MS
  )
    .toISOString()
    .slice(0, 10);

  const doneDayIds = new Set(
    completedSessions
      .filter(
        (s) =>
          s.workoutDayId !== null && s.date >= weekStart && s.date <= weekEnd
      )
      .map((s) => s.workoutDayId as string)
  );

  const minDayOrder =
    workoutDays.length > 0 ? Math.min(...workoutDays.map((d) => d.dayOrder)) : 1;
  const dayOrderOffset = minDayOrder === 0 ? 1 : 0;

  const stateByDayId: Record<string, WeekDayState> = {};
  let doneCount = 0;

  for (const day of workoutDays) {
    if (doneDayIds.has(day.id)) {
      stateByDayId[day.id] = 'done';
      doneCount += 1;
      continue;
    }
    const plannedDate = plannedDateFor(day, weekStart, dayOrderOffset);
    if (plannedDate === today) {
      stateByDayId[day.id] = 'today';
    } else if (plannedDate < today) {
      stateByDayId[day.id] = 'missed';
    } else {
      stateByDayId[day.id] = 'upcoming';
    }
  }

  return { stateByDayId, doneCount, plannedCount: workoutDays.length };
}
