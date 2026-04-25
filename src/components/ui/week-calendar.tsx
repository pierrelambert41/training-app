import { View, ScrollView, Pressable } from 'react-native';
import { AppText } from './text';
import type { WorkoutDay, SplitType } from '@/types/workout-day';

const DAY_ABBR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const SPLIT_COLORS: Record<SplitType, string> = {
  push: 'bg-accent',
  pull: 'bg-status-success',
  legs: 'bg-status-warning',
  upper: 'bg-accent',
  lower: 'bg-status-warning',
  full: 'bg-status-success',
};

const SPLIT_ICONS: Record<SplitType, string> = {
  push: 'P',
  pull: 'P',
  legs: 'L',
  upper: 'U',
  lower: 'L',
  full: 'F',
};

function addDays(isoDate: string, days: number): Date {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d;
}

function isoToMonday(isoDate: string): Date {
  const d = new Date(isoDate);
  const jsDay = d.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  d.setDate(d.getDate() + diffToMonday);
  return d;
}

function formatDayMonth(date: Date): string {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  return `${day}/${month}`;
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

type WeekDayCell = {
  dayIndex: number;
  date: Date;
  workoutDay: WorkoutDay | null;
};

function buildWeekCells(
  startDate: string | null,
  weekNumber: number,
  workoutDays: WorkoutDay[]
): WeekDayCell[] {
  const workoutDayByOrder = new Map<number, WorkoutDay>();
  for (const wd of workoutDays) {
    workoutDayByOrder.set(wd.dayOrder, wd);
  }

  const cells: WeekDayCell[] = [];

  for (let i = 0; i < 7; i++) {
    const dayOrder = i + 1;
    let date: Date;

    if (startDate) {
      const blockMonday = isoToMonday(startDate);
      const weekOffset = (weekNumber - 1) * 7;
      date = addDays(
        blockMonday.toISOString().slice(0, 10),
        weekOffset + i
      );
    } else {
      const today = new Date();
      const todayJsDay = today.getDay();
      const diffToMonday = todayJsDay === 0 ? -6 : 1 - todayJsDay;
      date = new Date(today);
      date.setDate(today.getDate() + diffToMonday + i);
    }

    cells.push({
      dayIndex: i,
      date,
      workoutDay: workoutDayByOrder.get(dayOrder) ?? null,
    });
  }

  return cells;
}

type DayCellProps = {
  cell: WeekDayCell;
  onPress: (workoutDay: WorkoutDay) => void;
};

function DayCell({ cell, onPress }: DayCellProps) {
  const { date, workoutDay, dayIndex } = cell;
  const today = isToday(date);
  const hasWorkout = workoutDay !== null;

  const containerBase =
    'items-center justify-center gap-1 rounded-card py-2 px-1';
  const containerActive = today
    ? 'bg-accent/20 border border-accent/60'
    : 'bg-background-elevated border border-border';
  const containerOff = 'bg-background-surface border border-border opacity-50';

  if (!hasWorkout) {
    return (
      <View
        className={`${containerBase} ${containerOff}`}
        style={{ minWidth: 44, minHeight: 80 }}
      >
        <AppText variant="caption" className="text-content-muted font-medium">
          {DAY_ABBR[dayIndex]}
        </AppText>
        <AppText variant="caption" className="text-content-muted">
          {formatDayMonth(date)}
        </AppText>
        <View className="w-5 h-5" />
      </View>
    );
  }

  const splitType = workoutDay.splitType;
  const dotColor =
    splitType ? SPLIT_COLORS[splitType] : 'bg-accent';
  const icon =
    splitType ? SPLIT_ICONS[splitType] : '•';

  return (
    <Pressable
      onPress={() => onPress(workoutDay)}
      className={`${containerBase} ${containerActive} active:opacity-70`}
      style={{ minWidth: 44, minHeight: 80 }}
      accessibilityRole="button"
      accessibilityLabel={`${DAY_ABBR[dayIndex]} ${formatDayMonth(date)} — ${workoutDay.title}`}
    >
      <AppText
        variant="caption"
        className={`font-semibold ${today ? 'text-accent' : 'text-content-primary'}`}
      >
        {DAY_ABBR[dayIndex]}
      </AppText>
      <AppText
        variant="caption"
        className={today ? 'text-accent' : 'text-content-secondary'}
      >
        {formatDayMonth(date)}
      </AppText>
      <View
        className={`w-6 h-6 rounded-chip items-center justify-center ${dotColor}`}
      >
        <AppText className="text-caption text-white font-bold leading-none">
          {icon}
        </AppText>
      </View>
    </Pressable>
  );
}

type WeekCalendarProps = {
  startDate: string | null;
  weekNumber: number;
  durationWeeks: number;
  workoutDays: WorkoutDay[];
  onDayPress: (workoutDay: WorkoutDay) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
};

export function WeekCalendar({
  startDate,
  weekNumber,
  durationWeeks,
  workoutDays,
  onDayPress,
  onPrevWeek,
  onNextWeek,
}: WeekCalendarProps) {
  const cells = buildWeekCells(startDate, weekNumber, workoutDays);

  return (
    <View className="bg-background-surface border-b border-border">
      <View className="flex-row items-center justify-between px-4 pt-3 pb-2">
        <Pressable
          onPress={onPrevWeek}
          disabled={weekNumber <= 1}
          className="items-center justify-center active:opacity-60"
          style={{ minWidth: 44, minHeight: 44 }}
          accessibilityRole="button"
          accessibilityLabel="Semaine précédente"
        >
          <AppText
            variant="body"
            className={weekNumber <= 1 ? 'text-content-muted' : 'text-content-primary'}
          >
            ‹
          </AppText>
        </Pressable>

        <AppText variant="caption" className="font-semibold text-content-secondary tracking-wide">
          SEMAINE {weekNumber} / {durationWeeks}
        </AppText>

        <Pressable
          onPress={onNextWeek}
          disabled={weekNumber >= durationWeeks}
          className="items-center justify-center active:opacity-60"
          style={{ minWidth: 44, minHeight: 44 }}
          accessibilityRole="button"
          accessibilityLabel="Semaine suivante"
        >
          <AppText
            variant="body"
            className={weekNumber >= durationWeeks ? 'text-content-muted' : 'text-content-primary'}
          >
            ›
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row gap-2 px-4 pb-4"
      >
        {cells.map((cell) => (
          <DayCell
            key={cell.dayIndex}
            cell={cell}
            onPress={onDayPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}
