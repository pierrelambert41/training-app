import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useActiveProgram } from '@/hooks/use-active-program';
import { useActiveProgramStore } from '@/stores/active-program-store';
import { Button, AppText, EmptyState, WeekCalendar } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { WorkoutDay } from '@/types/workout-day';

const SPLIT_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full: 'Full Body',
};

const GOAL_LABELS: Record<string, string> = {
  hypertrophy: 'Hypertrophie',
  strength: 'Force',
  peaking: 'Peaking',
  deload: 'Deload',
};

function WeekProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 0 : Math.min(done / total, 1);
  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <AppText variant="caption">
          Séances cette semaine
        </AppText>
        <AppText variant="caption" className="text-content-primary font-semibold">
          {done} / {total}
        </AppText>
      </View>
      <View className="h-2 bg-background-elevated rounded-chip overflow-hidden">
        <View
          className="h-2 bg-accent rounded-chip"
          style={{ width: `${pct * 100}%` }}
        />
      </View>
    </View>
  );
}

function DeloadBadge() {
  return (
    <View className="self-start bg-status-warning/20 border border-status-warning/40 rounded-chip px-3 py-1">
      <AppText variant="caption" className="text-status-warning font-semibold">
        DELOAD
      </AppText>
    </View>
  );
}

type DayStatus = 'done' | 'scheduled';

function dayStatus(day: WorkoutDay, sessionCount: number): DayStatus {
  if (sessionCount > 0) return 'done';
  return 'scheduled';
}

type WorkoutDayRowProps = {
  day: WorkoutDay;
  sessionCount: number;
  onPress: (day: WorkoutDay) => void;
};

function WorkoutDayRow({ day, sessionCount, onPress }: WorkoutDayRowProps) {
  const status = dayStatus(day, sessionCount);

  return (
    <Pressable
      onPress={() => onPress(day)}
      className="flex-row items-center gap-3 py-3 px-4 bg-background-surface border border-border rounded-card active:opacity-70"
      style={{ minHeight: 72 }}
    >
      <StatusIcon status={status} />

      <View className="flex-1 gap-0.5">
        <AppText variant="body" className="font-semibold">
          {day.title}
        </AppText>
        <View className="flex-row items-center gap-2">
          {day.splitType && (
            <AppText variant="caption">
              {SPLIT_LABELS[day.splitType] ?? day.splitType}
            </AppText>
          )}
          {day.estimatedDurationMin && (
            <>
              {day.splitType && (
                <AppText variant="caption" muted>·</AppText>
              )}
              <AppText variant="caption">
                ~{day.estimatedDurationMin} min
              </AppText>
            </>
          )}
        </View>
      </View>

      {status === 'scheduled' && (
        <AppText variant="body" className="text-content-secondary">›</AppText>
      )}
    </Pressable>
  );
}

function StatusIcon({ status }: { status: DayStatus }) {
  if (status === 'done') {
    return (
      <View className="w-8 h-8 rounded-full bg-status-success/20 items-center justify-center">
        <AppText className="text-label text-status-success font-bold">✓</AppText>
      </View>
    );
  }
  return (
    <View className="w-8 h-8 rounded-full bg-background-elevated border border-border-strong items-center justify-center">
      <AppText variant="caption">○</AppText>
    </View>
  );
}

type BlockHeaderProps = {
  title: string;
  goal: string;
  weekNumber: number;
  durationWeeks: number;
  isDeload: boolean;
  daysDone: number;
  totalDays: number;
};

function BlockHeader({
  title,
  goal,
  weekNumber,
  durationWeeks,
  isDeload,
  daysDone,
  totalDays,
}: BlockHeaderProps) {
  return (
    <View className="gap-4 px-4 pt-4 pb-5 bg-background-surface border-b border-border">
      <View className="gap-2">
        <View className="flex-row items-start justify-between gap-2">
          <View className="flex-1 gap-0.5">
            <AppText variant="heading" className="font-semibold">
              {title}
            </AppText>
            <AppText className="text-label text-content-secondary">
              {GOAL_LABELS[goal] ?? goal}
            </AppText>
          </View>
          <View className="items-end gap-1">
            <AppText className="text-display text-accent font-bold leading-none">
              {weekNumber}
            </AppText>
            <AppText variant="caption" muted>
              / {durationWeeks} sem.
            </AppText>
          </View>
        </View>
        {isDeload && <DeloadBadge />}
      </View>
      <WeekProgressBar done={daysDone} total={totalDays} />
    </View>
  );
}

export default function ActiveBlockScreen() {
  const router = useRouter();
  const { isLoading, error } = useActiveProgram();
  const program = useActiveProgramStore((s) => s.program);
  const activeBlock = useActiveProgramStore((s) => s.activeBlock);
  const workoutDays = useActiveProgramStore((s) => s.workoutDays);
  const sessionCountsByDayId = useActiveProgramStore((s) => s.sessionCountsByDayId);
  const [calendarWeek, setCalendarWeek] = useState<number | null>(null);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-background p-4 justify-center">
        <EmptyState
          title="Erreur de chargement"
          description="Impossible de charger le programme. Vérifie ta connexion et réessaie."
        />
      </View>
    );
  }

  if (!program || !activeBlock) {
    return (
      <View className="flex-1 bg-background p-4 justify-center">
        <EmptyState
          title="Aucun programme actif"
          description="Génère un programme pour commencer à t'entraîner."
        />
        <View className="mt-4">
          <Button
            label="Créer un programme"
            onPress={() =>
              router.replace(
                '/(app)/programs/generate' as Parameters<typeof router.replace>[0]
              )
            }
          />
        </View>
      </View>
    );
  }

  const daysDone = workoutDays.filter(
    (d) => (sessionCountsByDayId[d.id] ?? 0) > 0
  ).length;
  const isDeload =
    activeBlock.deloadStrategy === 'scheduled' ||
    activeBlock.goal === 'deload';

  const todayDay = workoutDays.find(
    (d) => (sessionCountsByDayId[d.id] ?? 0) === 0
  );

  const displayWeek = calendarWeek ?? activeBlock.weekNumber;

  function handleDayPress(day: WorkoutDay) {
    if (!program) return;
    router.push(
      `/(app)/programs/${program.id}/day/${day.id}` as Parameters<typeof router.push>[0]
    );
  }

  function handleStartSession() {
    if (!todayDay) return;
    router.push(`/(app)/session/start?workoutDayId=${todayDay.id}` as Parameters<typeof router.push>[0]);
  }

  const blockWeekNumber = activeBlock.weekNumber;
  const blockDurationWeeks = activeBlock.durationWeeks;

  function handlePrevWeek() {
    setCalendarWeek((w) => Math.max(1, (w ?? blockWeekNumber) - 1));
  }

  function handleNextWeek() {
    setCalendarWeek((w) =>
      Math.min(blockDurationWeeks, (w ?? blockWeekNumber) + 1)
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-36"
        showsVerticalScrollIndicator={false}
      >
        <BlockHeader
          title={activeBlock.title}
          goal={activeBlock.goal}
          weekNumber={activeBlock.weekNumber}
          durationWeeks={activeBlock.durationWeeks}
          isDeload={isDeload}
          daysDone={daysDone}
          totalDays={workoutDays.length}
        />

        <WeekCalendar
          startDate={activeBlock.startDate}
          weekNumber={displayWeek}
          durationWeeks={activeBlock.durationWeeks}
          workoutDays={workoutDays}
          onDayPress={handleDayPress}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
        />

        <View className="px-4 pt-5 gap-3">
          <AppText variant="caption" muted>
            JOURS D'ENTRAÎNEMENT
          </AppText>

          {workoutDays.length === 0 ? (
            <EmptyState
              title="Aucun jour configuré"
              description="Ce bloc ne contient pas encore de jours d'entraînement."
            />
          ) : (
            workoutDays.map((day) => (
              <WorkoutDayRow
                key={day.id}
                day={day}
                sessionCount={sessionCountsByDayId[day.id] ?? 0}
                onPress={handleDayPress}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-background border-t border-border gap-3">
        <Button
          label={
            todayDay
              ? `Démarrer — ${todayDay.title}`
              : 'Toutes les séances complétées'
          }
          onPress={handleStartSession}
          size="lg"
          disabled={!todayDay}
        />
      </View>
    </View>
  );
}
