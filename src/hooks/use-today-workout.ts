import { useQuery } from '@tanstack/react-query';
import { useDB } from './use-db';
import { useAuthStore } from '@/features/auth';
import { useActiveProgramStore } from '@/stores/active-program-store';
import { getPlannedExercisesByWorkoutDayId } from '@/services/planned-exercises';
import { getExercisesByIds } from '@/services/exercises';
import { getSessionsByUserId } from '@/services/sessions';
import type { WorkoutDay } from '@/types/workout-day';
import type { Session } from '@/types/session';
import type { PlannedExerciseWithExercise } from './use-workout-day-detail';
import type { DisplaySessionStatus } from '@/components/ui';
import type { CompletedTodayData } from '@/features/today/types/completed-today-data';

/**
 * Mappe dayOrder (1=lundi … 7=dimanche) sur JS getDay() (0=dim, 1=lun … 6=sam).
 */
function dayOrderToJsDay(dayOrder: number): number {
  if (dayOrder === 7) return 0;
  return dayOrder;
}

function isTodayWorkoutDay(day: WorkoutDay): boolean {
  const jsDay = new Date().getDay();
  return dayOrderToJsDay(day.dayOrder) === jsDay;
}

function computeStreak(sessions: Session[], workoutDays: WorkoutDay[]): number {
  const workoutJsDays = new Set(workoutDays.map((d) => dayOrderToJsDay(d.dayOrder)));
  const completedDates = new Set(
    sessions
      .filter((s) => s.status === 'completed')
      .map((s) => s.date)
  );

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const jsDay = d.getDay();
    const dateStr = d.toISOString().slice(0, 10);

    if (!workoutJsDays.has(jsDay)) continue;
    if (completedDates.has(dateStr)) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

export type TodayWorkoutData = {
  workoutDay: WorkoutDay;
  plannedExercises: PlannedExerciseWithExercise[];
  sessionStatus: DisplaySessionStatus;
  lastCompletedSession: Session | null;
  streak: number;
};

export type { CompletedTodayData };

export type TodayScreenData =
  | { state: 'no_program' }
  | { state: 'rest_day'; lastCompletedSession: Session | null; streak: number }
  | { state: 'workout'; data: TodayWorkoutData }
  | { state: 'in_progress'; data: TodayWorkoutData }
  | { state: 'completed_today'; data: CompletedTodayData };

async function fetchTodayData(
  db: Parameters<typeof getSessionsByUserId>[0],
  userId: string,
  workoutDays: WorkoutDay[],
  hasProgram: boolean
): Promise<TodayScreenData> {
  if (!hasProgram) return { state: 'no_program' };

  const sessions = await getSessionsByUserId(db, userId, 60);
  const lastCompletedSession = sessions.find((s) => s.status === 'completed') ?? null;
  const streak = computeStreak(sessions, workoutDays);

  const todayDay = workoutDays.find(isTodayWorkoutDay) ?? null;

  if (!todayDay) {
    return { state: 'rest_day', lastCompletedSession, streak };
  }

  const todayDate = new Date().toISOString().slice(0, 10);

  const completedToday = sessions.find(
    (s) =>
      s.status === 'completed' &&
      s.date === todayDate &&
      s.workoutDayId === todayDay.id
  ) ?? null;

  if (completedToday) {
    return {
      state: 'completed_today',
      data: { workoutDay: todayDay, completedSession: completedToday, streak },
    };
  }

  const inProgressToday = sessions.find(
    (s) =>
      s.status === 'in_progress' &&
      s.date === todayDate &&
      s.workoutDayId === todayDay.id
  ) ?? null;

  const plannedExercises = await getPlannedExercisesByWorkoutDayId(db, todayDay.id);
  const exerciseIds = plannedExercises.map((pe) => pe.exerciseId);
  const exercises = exerciseIds.length > 0 ? await getExercisesByIds(db, exerciseIds) : [];
  const exercisesById = new Map(exercises.map((e) => [e.id, e]));

  const plannedWithExercise: PlannedExerciseWithExercise[] = plannedExercises.flatMap((pe) => {
    const exercise = exercisesById.get(pe.exerciseId);
    if (!exercise) return [];
    return [{ ...pe, exercise }];
  });

  const sessionStatus: DisplaySessionStatus = lastCompletedSession !== null ? 'progression' : 'maintien';

  const data: TodayWorkoutData = {
    workoutDay: todayDay,
    plannedExercises: plannedWithExercise,
    sessionStatus,
    lastCompletedSession,
    streak,
  };

  return inProgressToday
    ? { state: 'in_progress', data }
    : { state: 'workout', data };
}

export function useTodayWorkout() {
  const db = useDB();
  const userId = useAuthStore((s) => s.user?.id);
  const program = useActiveProgramStore((s) => s.program);
  const workoutDays = useActiveProgramStore((s) => s.workoutDays);

  return useQuery({
    queryKey: ['today-workout', userId, program?.id, workoutDays.length],
    queryFn: () => fetchTodayData(db, userId!, workoutDays, program !== null),
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}
