import { View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore, useAuth } from '@/features/auth';
import {
  AISummaryCard,
  AIInsightBadge,
  inferHighlightSentiment,
  useLatestSessionSummary,
  useAIHighlights,
} from '@/features/ai';
import { useActiveProgramStore } from '@/stores/active-program-store';
import { useDB } from '@/hooks/use-db';
import { useActiveProgram } from '@/hooks/use-active-program';
import { useActiveSession } from '@/hooks/use-active-session';
import { useTodayWorkout } from '@/hooks/use-today-workout';
import { useSessionStore } from '@/stores/session-store';
import { AppText, Button } from '@/components/ui';
import { useTodayRecommendations } from '../hooks/use-today-recommendations';
import { WorkoutCard } from './workout-card';
import { FatigueCard } from './fatigue-card';
import { PlateauCard } from './plateau-card';
import { DeloadCard } from './deload-card';
import { MiniSummary } from './mini-summary';
import { RestDayCard } from './rest-day-card';
import { NoProgramCard } from './no-program-card';
import { CompletedTodayCard } from './completed-today-card';
import { DevToolsSection } from './dev-tools-section';

const MAX_VISIBLE_HIGHLIGHTS = 4;

export function TodayScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout, isLoading } = useAuth();
  const db = useDB();

  const { isLoading: isProgramLoading } = useActiveProgram();
  const { data: todayData } = useTodayWorkout();
  const { data: recommendations } = useTodayRecommendations();
  const activeProgram = useActiveProgramStore((s) => s.program);
  const session = useSessionStore((s) => s.session);
  const { latest: latestAISummary } = useLatestSessionSummary(user?.id);
  const { highlights } = useAIHighlights(user?.id);

  useActiveSession();

  async function handleLogout() {
    await logout();
  }

  function handleStartSession() {
    const workoutDayId =
      todayData?.state === 'workout' || todayData?.state === 'in_progress'
        ? todayData.data.workoutDay.id
        : undefined;
    const path = workoutDayId
      ? (`/(app)/session/start?workoutDayId=${workoutDayId}` as Parameters<typeof router.push>[0])
      : ('/(app)/session/start' as Parameters<typeof router.push>[0]);
    router.push(path);
  }

  function handleResumeSession() {
    router.push('/(app)/session/live' as Parameters<typeof router.push>[0]);
  }

  function handleViewProgram() {
    if (activeProgram) {
      router.push(`/(app)/programs/${activeProgram.id}` as Parameters<typeof router.push>[0]);
    }
  }

  function handleGenerateProgram() {
    router.push('/(app)/programs/generate' as Parameters<typeof router.push>[0]);
  }

  const inProgressFromStore = session?.status === 'in_progress';

  const fatigueScore = recommendations?.fatigueScore ?? null;
  const showFatigueCard = fatigueScore !== null && fatigueScore >= 4;
  const plateauCount = recommendations?.plateauRecommendations.length ?? 0;
  const deloadRec = recommendations?.deloadRecommendation ?? null;

  const lastSession =
    todayData?.state === 'rest_day'
      ? todayData.lastCompletedSession
      : todayData?.state === 'workout' || todayData?.state === 'in_progress'
        ? todayData.data.lastCompletedSession
        : todayData?.state === 'completed_today'
          ? todayData.data.completedSession
          : null;

  const streak =
    todayData?.state === 'rest_day'
      ? todayData.streak
      : todayData?.state === 'workout' || todayData?.state === 'in_progress'
        ? todayData.data.streak
        : todayData?.state === 'completed_today'
          ? todayData.data.streak
          : 0;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
    <ScrollView
      className="flex-1"
      contentContainerClassName="p-4 gap-6 pb-12"
      testID="home-screen"
    >
      <View className="mt-4 gap-1">
        <AppText variant="heading">Aujourd'hui</AppText>
        {user?.email ? (
          <AppText variant="body" muted>{user.email}</AppText>
        ) : null}
      </View>

      {highlights.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {highlights.slice(0, MAX_VISIBLE_HIGHLIGHTS).map((highlight, idx) => (
            <AIInsightBadge
              key={idx}
              text={highlight}
              sentiment={inferHighlightSentiment(highlight)}
            />
          ))}
        </View>
      ) : null}

      {deloadRec ? (
        <DeloadCard message={deloadRec.message} />
      ) : null}

      <View className="gap-3">
        <AppText variant="caption" muted>SEANCE DU JOUR</AppText>

        {inProgressFromStore &&
        (todayData?.state === 'rest_day' ||
          todayData?.state === 'no_program' ||
          !todayData) ? (
          <View className="bg-background-elevated rounded-card p-4 gap-3 border border-border-strong">
            <AppText variant="body" className="text-content-secondary">
              Une seance est en cours
            </AppText>
            <Button
              label="Reprendre la seance en cours"
              onPress={handleResumeSession}
              variant="primary"
              size="lg"
              testID="resume-session-button"
            />
          </View>
        ) : null}

        {isProgramLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color="#ffffff" />
          </View>
        ) : !todayData || todayData.state === 'no_program' ? (
          <NoProgramCard onGenerate={handleGenerateProgram} />
        ) : todayData.state === 'rest_day' ? (
          <RestDayCard onViewProgram={handleViewProgram} />
        ) : todayData.state === 'completed_today' ? (
          <CompletedTodayCard data={todayData.data} />
        ) : todayData.state === 'workout' || todayData.state === 'in_progress' ? (
          <WorkoutCard
            data={todayData.data}
            recommendations={recommendations ?? null}
            onStart={handleStartSession}
            onResume={handleResumeSession}
            isInProgress={inProgressFromStore || todayData.state === 'in_progress'}
          />
        ) : null}
      </View>

      {showFatigueCard ? (
        <FatigueCard fatigueScore={fatigueScore!} />
      ) : null}

      {plateauCount > 0 ? (
        <PlateauCard count={plateauCount} />
      ) : null}

      {latestAISummary ? (
        <View className="gap-3">
          <AppText variant="caption" muted>DERNIÈRE SÉANCE</AppText>
          <AISummaryCard type="session" summary={latestAISummary.summary} />
        </View>
      ) : null}

      {todayData && todayData.state !== 'no_program' ? (
        <View className="gap-3">
          <AppText variant="caption" muted>PROGRESSION</AppText>
          <MiniSummary lastSession={lastSession} streak={streak} />
        </View>
      ) : null}

      {__DEV__ ? <DevToolsSection db={db} userId={user?.id} /> : null}

      <View className="mt-4">
        <Button
          label="Se deconnecter"
          onPress={handleLogout}
          variant="ghost"
          loading={isLoading}
          testID="logout-button"
        />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
