import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { CalendarX2, Check, ChevronRight, Play, Target } from 'lucide-react-native';
import { useActiveProgram } from '@/hooks/use-active-program';
import { useActiveProgramStore } from '@/stores/active-program-store';
import { AISummaryCard, FallbackUpgradeBanner, useStoredBlockSummary } from '@/features/ai';
import { useAuthStore } from '@/features/auth';
import { useWeekProgress } from '@/hooks/use-week-progress';
import { Button, AppText, Chip, EmptyState, SectionHeader, WeekCalendar } from '@/components/ui';
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
    <View className="gap-2">
      <View className="flex-row justify-between">
        <AppText variant="caption" muted>
          Séances cette semaine
        </AppText>
        <AppText variant="caption" className="text-content-primary font-bold">
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

/** Indicateur de progression du bloc : un segment par semaine. */
function WeekSegments({ current, total }: { current: number; total: number }) {
  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: total }, (_, i) => {
        const week = i + 1;
        const cls =
          week < current
            ? 'bg-accent/40'
            : week === current
              ? 'bg-accent'
              : 'bg-background-elevated';
        return <View key={week} className={`flex-1 h-1.5 rounded-chip ${cls}`} />;
      })}
    </View>
  );
}

function DeloadBadge() {
  return (
    <View className="self-start bg-status-warning/15 rounded-chip px-3 py-1">
      <AppText variant="caption" className="text-status-warning font-bold">
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
  dayIndex: number;
  sessionCount: number;
  onPress: (day: WorkoutDay) => void;
};

function WorkoutDayRow({ day, dayIndex, sessionCount, onPress }: WorkoutDayRowProps) {
  const status = dayStatus(day, sessionCount);

  return (
    <Pressable
      onPress={() => onPress(day)}
      className="flex-row items-center gap-3 py-3 px-4 bg-background-surface rounded-card active:opacity-70"
      style={{ minHeight: 72, borderCurve: 'continuous' }}
    >
      <StatusIcon status={status} dayIndex={dayIndex} />

      <View className="flex-1 gap-0.5">
        <AppText variant="body" className="font-semibold">
          {day.title}
        </AppText>
        <View className="flex-row items-center gap-2">
          {day.splitType && (
            <AppText variant="caption" muted>
              {SPLIT_LABELS[day.splitType] ?? day.splitType}
            </AppText>
          )}
          {day.estimatedDurationMin && (
            <>
              {day.splitType && (
                <AppText variant="caption" muted>·</AppText>
              )}
              <AppText variant="caption" muted>
                ~{day.estimatedDurationMin} min
              </AppText>
            </>
          )}
        </View>
      </View>

      {status === 'done' ? (
        <AppText variant="caption" className="text-status-success font-semibold">
          Fait
        </AppText>
      ) : (
        <ChevronRight size={18} color={colors.contentMuted} />
      )}
    </Pressable>
  );
}

function StatusIcon({ status, dayIndex }: { status: DayStatus; dayIndex: number }) {
  if (status === 'done') {
    return (
      <View className="w-10 h-10 rounded-full bg-status-success/15 items-center justify-center">
        <Check size={18} color={colors.statusSuccess} strokeWidth={2.6} />
      </View>
    );
  }
  return (
    <View className="w-10 h-10 rounded-full bg-background-elevated items-center justify-center">
      <AppText className="text-label font-bold text-content-secondary">{dayIndex + 1}</AppText>
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
    <View className="gap-4 px-4 pt-5 pb-2">
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <Chip label={GOAL_LABELS[goal] ?? goal} icon={Target} />
          {isDeload && <DeloadBadge />}
        </View>
        <AppText
          className="text-content-primary font-bold"
          style={{ fontSize: 27, lineHeight: 32, letterSpacing: -0.5 }}
        >
          {title}
        </AppText>
      </View>

      <View className="gap-2">
        <View className="flex-row justify-between">
          <AppText variant="caption" muted>Progression du bloc</AppText>
          <AppText variant="caption" className="text-content-primary font-bold">
            Semaine {weekNumber} / {durationWeeks}
          </AppText>
        </View>
        <WeekSegments current={weekNumber} total={durationWeeks} />
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
  const { summary: blockSummary } = useStoredBlockSummary(activeBlock?.id);
  const userId = useAuthStore((s) => s.user?.id);

  // TA-155 — progression de semaine : la semaine réelle du bloc pour le
  // compteur du header, la semaine affichée pour les états du calendrier.
  const displayWeek = calendarWeek ?? activeBlock?.weekNumber ?? 1;
  const currentWeekProgress = useWeekProgress(
    activeBlock,
    workoutDays,
    activeBlock?.weekNumber ?? 1
  );
  const displayedWeekProgress = useWeekProgress(
    activeBlock,
    workoutDays,
    displayWeek
  );

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

  // Compteur "Séances cette semaine" basé sur la semaine réelle (TA-155) —
  // remplace l'ancien comptage bloc-entier (sessionCountsByDayId) qui
  // affichait "fait" pour un jour réalisé n'importe quand dans le bloc.
  const daysDone = currentWeekProgress?.doneCount ?? 0;
  const isDeload =
    activeBlock.deloadStrategy === 'scheduled' ||
    activeBlock.goal === 'deload';

  const todayDay = workoutDays.find(
    (d) => (sessionCountsByDayId[d.id] ?? 0) === 0
  );

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
        {program.generationSource === 'fallback' ? (
          <View className="px-4 pt-4">
            <FallbackUpgradeBanner program={program} userId={userId} />
          </View>
        ) : null}

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
          dayStates={displayedWeekProgress?.stateByDayId}
          onDayPress={handleDayPress}
          onPrevWeek={handlePrevWeek}
          onNextWeek={handleNextWeek}
        />

        {blockSummary ? (
          <View className="px-4 pt-6 gap-3">
            <SectionHeader title="Bilan du bloc" />
            <AISummaryCard type="block" summary={blockSummary} />
          </View>
        ) : null}

        <View className="px-4 pt-6 gap-3">
          <SectionHeader title="Jours d'entraînement" />

          {workoutDays.length === 0 ? (
            <EmptyState
              icon={CalendarX2}
              title="Aucun jour configuré"
              description="Ce bloc ne contient pas encore de jours d'entraînement."
            />
          ) : (
            workoutDays.map((day, index) => (
              <WorkoutDayRow
                key={day.id}
                day={day}
                dayIndex={index}
                sessionCount={sessionCountsByDayId[day.id] ?? 0}
                onPress={handleDayPress}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-background gap-3">
        <Button
          label={
            todayDay
              ? `Démarrer — ${todayDay.title}`
              : 'Toutes les séances complétées'
          }
          icon={todayDay ? Play : undefined}
          onPress={handleStartSession}
          size="lg"
          disabled={!todayDay}
        />
      </View>
    </View>
  );
}
