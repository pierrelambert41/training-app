import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { useDB } from '@/hooks/use-db';
import { useActiveProgram } from '@/hooks/use-active-program';
import { useTodayWorkout } from '@/hooks/use-today-workout';
import { useSessionStore } from '@/stores/session-store';
import { AppText, Button, Card, SessionStatusBadge } from '@/components/ui';
import type { TodayWorkoutData } from '@/hooks/use-today-workout';
import type { PlannedExerciseWithExercise } from '@/hooks/use-workout-day-detail';
import type { Session } from '@/types/session';
import type { SplitType } from '@/types/workout-day';

const SPLIT_LABELS: Record<SplitType, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full: 'Full Body',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function ExerciseList({ exercises }: { exercises: PlannedExerciseWithExercise[] }) {
  return (
    <View className="gap-2 mt-3">
      {exercises.slice(0, 5).map((pe) => (
        <View key={pe.id} className="flex-row items-center justify-between">
          <AppText variant="body" className="flex-1 mr-2" numberOfLines={1}>
            {pe.exercise.nameFr ?? pe.exercise.name}
          </AppText>
          <AppText variant="caption" muted>
            {pe.sets} x {pe.repRangeMin}–{pe.repRangeMax}
          </AppText>
        </View>
      ))}
      {exercises.length > 5 ? (
        <AppText variant="caption" muted>
          +{exercises.length - 5} autres exercices
        </AppText>
      ) : null}
    </View>
  );
}

function MiniSummary({
  lastSession,
  streak,
}: {
  lastSession: Session | null;
  streak: number;
}) {
  return (
    <View className="flex-row gap-3">
      <Card elevation="default" className="flex-1 gap-1">
        <AppText variant="caption" muted>Dernière séance</AppText>
        {lastSession ? (
          <>
            <AppText variant="body" className="font-semibold" numberOfLines={1}>
              {lastSession.date ? formatDate(lastSession.date) : '—'}
            </AppText>
          </>
        ) : (
          <AppText variant="body" muted>Aucune</AppText>
        )}
      </Card>
      <Card elevation="default" className="flex-1 gap-1">
        <AppText variant="caption" muted>Streak</AppText>
        <View className="flex-row items-baseline gap-1">
          <AppText variant="heading" className="text-accent">{streak}</AppText>
          <AppText variant="caption" muted>séance{streak > 1 ? 's' : ''}</AppText>
        </View>
      </Card>
    </View>
  );
}

function WorkoutCard({
  data,
  onStart,
  onResume,
  isInProgress,
}: {
  data: TodayWorkoutData;
  onStart: () => void;
  onResume: () => void;
  isInProgress: boolean;
}) {
  const { workoutDay, plannedExercises, sessionStatus } = data;

  return (
    <Card elevation="elevated" className="gap-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-1">
          <AppText variant="heading">{workoutDay.title}</AppText>
          {workoutDay.splitType ? (
            <AppText variant="caption" muted>{SPLIT_LABELS[workoutDay.splitType]}</AppText>
          ) : null}
          {workoutDay.estimatedDurationMin ? (
            <AppText variant="caption" muted>{workoutDay.estimatedDurationMin} min</AppText>
          ) : null}
        </View>
        <SessionStatusBadge status={sessionStatus} />
      </View>

      {plannedExercises.length > 0 ? (
        <ExerciseList exercises={plannedExercises} />
      ) : null}

      <Button
        label={isInProgress ? 'Reprendre la séance' : 'Démarrer la séance'}
        onPress={isInProgress ? onResume : onStart}
        variant="primary"
        size="lg"
        testID={isInProgress ? 'resume-session-button' : 'start-session-button'}
      />
    </Card>
  );
}

function RestDayCard({ onViewProgram }: { onViewProgram: () => void }) {
  return (
    <Card elevation="default" className="items-center gap-3 py-6">
      <AppText variant="heading">Jour de repos</AppText>
      <AppText variant="body" muted className="text-center">
        Profite bien de ta récupération. Ton prochain entraînement est planifié.
      </AppText>
      <Pressable onPress={onViewProgram} className="mt-1">
        <AppText variant="body" className="text-accent font-semibold">Voir mon programme</AppText>
      </Pressable>
    </Card>
  );
}

function NoProgramCard({ onGenerate }: { onGenerate: () => void }) {
  return (
    <Card elevation="default" className="items-center gap-3 py-6">
      <AppText variant="heading">Aucun programme actif</AppText>
      <AppText variant="body" muted className="text-center">
        Génère ton programme personnalisé pour commencer à t'entraîner.
      </AppText>
      <Button
        label="Créer un programme"
        onPress={onGenerate}
        variant="primary"
        size="lg"
        testID="generate-program-button"
      />
    </Card>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout, isLoading } = useAuth();
  const db = useDB();

  useActiveProgram();
  const { data: todayData } = useTodayWorkout();
  const session = useSessionStore((s) => s.session);

  async function handleLogout() {
    await logout();
  }

  async function handleSeedTestData() {
    const { seedActiveBlock } = await import('@/dev/seed-active-block');
    const userId = user?.id ?? 'dev-user';
    const programId = await seedActiveBlock(db, userId);
    router.push(`/(app)/programs/${programId}` as Parameters<typeof router.push>[0]);
  }

  function handleStartSession() {
    router.push('/(app)/session/readiness' as Parameters<typeof router.push>[0]);
  }

  function handleResumeSession() {
    router.push('/(app)/session/live' as Parameters<typeof router.push>[0]);
  }

  function handleViewProgram() {
    router.push('/(app)/programs' as Parameters<typeof router.push>[0]);
  }

  function handleGenerateProgram() {
    router.push('/(app)/programs/generate' as Parameters<typeof router.push>[0]);
  }

  const inProgressFromStore = session?.status === 'in_progress';

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-6 pb-12"
      testID="home-screen"
    >
      <View className="mt-4 gap-1">
        <AppText variant="heading">Aujourd'hui</AppText>
        {user?.email ? (
          <AppText variant="body" muted>{user.email}</AppText>
        ) : null}
      </View>

      <View className="gap-3">
        <AppText variant="caption" muted>SÉANCE DU JOUR</AppText>

        {!todayData || todayData.state === 'no_program' ? (
          <NoProgramCard onGenerate={handleGenerateProgram} />
        ) : todayData.state === 'rest_day' ? (
          <RestDayCard onViewProgram={handleViewProgram} />
        ) : todayData.state === 'workout' || todayData.state === 'in_progress' ? (
          <WorkoutCard
            data={todayData.data}
            onStart={handleStartSession}
            onResume={handleResumeSession}
            isInProgress={inProgressFromStore || todayData.state === 'in_progress'}
          />
        ) : null}
      </View>

      {todayData && todayData.state !== 'no_program' ? (
        <View className="gap-3">
          <AppText variant="caption" muted>PROGRESSION</AppText>
          <MiniSummary
            lastSession={
              todayData.state === 'rest_day'
                ? todayData.lastCompletedSession
                : todayData.data.lastCompletedSession
            }
            streak={
              todayData.state === 'rest_day'
                ? todayData.streak
                : todayData.data.streak
            }
          />
        </View>
      ) : null}

      {__DEV__ ? (
        <View className="gap-2">
          <AppText variant="caption" muted>DEV</AppText>
          <Button
            label="Seed test"
            onPress={handleSeedTestData}
            variant="secondary"
            testID="seed-test-button"
          />
        </View>
      ) : null}

      <View className="mt-4">
        <Button
          label="Se déconnecter"
          onPress={handleLogout}
          variant="ghost"
          loading={isLoading}
          testID="logout-button"
        />
      </View>
    </ScrollView>
  );
}
