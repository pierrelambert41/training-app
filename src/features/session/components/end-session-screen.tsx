import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth';
import { useSessionStore } from '@/stores/session-store';
import { useDB } from '@/hooks/use-db';
import { useSessionExercises } from '@/hooks/use-session-exercises';
import { getLatestBodyMetric } from '@/services/body-metrics';
import { computeSessionTonnage } from '@/lib/session-tonnage';
import { toDisplayWeight } from '@/lib/units';
import { usePreferredUnit } from '@/stores/settings-store';
import {
  computeExerciseAchievements,
  computeSessionScores,
  performanceScoreLabel,
} from '@/services/session-scores';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { Recommendation } from '@/types';
import { useCompleteSession } from '../hooks/use-complete-session';
import { useAISessionSummary } from '../hooks/use-ai-session-summary';
import { formatDuration, ScoreRing, StatPill } from './session-score-ring';
import { SessionRecommendations } from './session-recommendations';
import { SessionAISummary } from './session-ai-summary';
import { PerExerciseList, PostNotesInput } from './end-session-sections';

type CompletionState = 'idle' | 'completing' | 'completed';

export function EndSessionScreen() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setLogs = useSessionStore((s) => s.setLogs);
  const plannedExercises = useSessionStore((s) => s.plannedExercises);
  const reset = useSessionStore((s) => s.reset);
  const userId = useAuthStore((s) => s.user?.id);

  const { complete, isCompleting, isCompleted, rulesResult } = useCompleteSession(userId);
  const completionState: CompletionState = isCompleted ? 'completed' : isCompleting ? 'completing' : 'idle';

  const [postNotes, setPostNotes] = useState(session?.postSessionNotes ?? '');
  const recommendations: Recommendation[] | null = rulesResult?.recommendations ?? (isCompleted ? [] : null);

  const aiSummary = useAISessionSummary(session?.id ?? null, isCompleted);

  const { data: exerciseData } = useSessionExercises(
    plannedExercises,
    session?.workoutDayId ?? null
  );
  const exercisesById = exerciseData?.exercisesById ?? new Map();

  // Tonnage informatif (Σ charge×reps, BW inclus pour les exos bodyweight) —
  // le moteur de progression ne s'en sert pas (doctrine séries/muscle).
  const db = useDB();
  const preferredUnit = usePreferredUnit();
  const { data: latestBodyMetric } = useQuery({
    queryKey: ['latest-body-metric', userId, session?.date],
    queryFn: () => getLatestBodyMetric(db, userId!, session!.date),
    enabled: !!userId && !!session,
  });
  const tonnage = useMemo(
    () => computeSessionTonnage(setLogs, exercisesById, latestBodyMetric?.weightKg ?? null),
    [setLogs, exercisesById, latestBodyMetric]
  );
  const tonnageValue = `${toDisplayWeight(tonnage.totalKg, preferredUnit).toLocaleString('fr-FR')} ${preferredUnit}`;

  const scores = useMemo(() => {
    if (!session) return null;
    return computeSessionScores(session, setLogs, plannedExercises);
  }, [session, setLogs, plannedExercises]);

  const finalDuration = useMemo(
    () => formatDuration(session?.startedAt ?? null, new Date().toISOString()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [session?.startedAt]
  );

  const achievements = useMemo(
    () => computeExerciseAchievements(setLogs, plannedExercises),
    [setLogs, plannedExercises]
  );

  const completedSets = setLogs.filter((sl) => sl.completed).length;
  const totalPlannedSets = plannedExercises
    .filter((pe) => !pe.isUnplanned)
    .reduce((acc, pe) => acc + pe.sets, 0);

  const completedExercises = useMemo(
    () =>
      plannedExercises.filter((pe) => {
        const done = setLogs.filter(
          (sl) => sl.plannedExerciseId === pe.id && sl.completed
        ).length;
        return done >= pe.sets;
      }).length,
    [plannedExercises, setLogs]
  );

  const completedPlannedSets = setLogs.filter(
    (sl) => sl.plannedExerciseId !== null && sl.completed
  ).length;
  const missingPlannedSets =
    totalPlannedSets > 0 ? totalPlannedSets - completedPlannedSets : 0;

  useEffect(() => {
    if (!session && completionState === 'idle') {
      router.replace('/(app)/(tabs)');
    }
  }, [session, completionState, router]);

  const doFinish = useCallback(async () => {
    if (!session) return;
    try {
      await complete(session.id, session.preSessionNotes, postNotes);
    } catch {
      // error already logged in useCompleteSession
    }
  }, [session, postNotes, complete]);

  const handleFinish = useCallback(async () => {
    if (!session) return;
    if (missingPlannedSets > 0) {
      Alert.alert(
        'Sets non loggés',
        `${missingPlannedSets} set${missingPlannedSets > 1 ? 's' : ''} non loggé${missingPlannedSets > 1 ? 's' : ''} — terminer quand même ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Terminer', style: 'destructive', onPress: () => void doFinish() },
        ]
      );
      return;
    }
    await doFinish();
  }, [session, missingPlannedSets, doFinish]);

  const handleGoHome = useCallback(() => {
    reset();
    router.replace('/(app)/(tabs)');
  }, [reset, router]);

  if (!session && completionState === 'idle') return null;
  if (!scores) return null;

  const label = performanceScoreLabel(scores.performance_score);
  const scoreColor =
    scores.performance_score >= 8
      ? colors.statusSuccess
      : scores.performance_score >= 6
        ? colors.statusInfo
        : scores.performance_score >= 4
          ? colors.statusWarning
          : scores.performance_score >= 2
            ? colors.statusWarning
            : colors.statusDanger;

  const fallbackSummaryText = `Séance complétée — ${completedSets} série${completedSets > 1 ? 's' : ''}, ${plannedExercises.length} exercice${plannedExercises.length > 1 ? 's' : ''}.`;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 20 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <View className="pt-6 pb-2 items-center gap-1">
          <AppText style={{ fontSize: 18, fontWeight: '600', color: colors.contentSecondary }}>
            Séance terminée
          </AppText>
        </View>

        <View className="items-center py-2 gap-3">
          <ScoreRing score={scores.performance_score} />
          <AppText style={{ fontSize: 24, fontWeight: '700', color: scoreColor }}>
            {label}
          </AppText>
        </View>

        <View className="gap-3">
          <View className="flex-row gap-3">
            <StatPill
              label="Sets"
              value={`${completedSets}/${totalPlannedSets > 0 ? totalPlannedSets : completedSets}`}
            />
            <StatPill
              label="Exercices"
              value={`${completedExercises}/${plannedExercises.filter((pe) => !pe.isUnplanned).length || completedExercises}`}
            />
            <StatPill label="Durée" value={finalDuration} />
          </View>
          {tonnage.totalKg > 0 ? (
            <View className="gap-1">
              <View className="flex-row gap-3">
                <StatPill
                  label="Tonnage"
                  value={tonnageValue}
                  testID="session-tonnage"
                />
              </View>
              {tonnage.missingBodyweight ? (
                <AppText variant="caption" muted testID="session-tonnage-warning">
                  Sous-estimé : exos au poids du corps sans pesée enregistrée.
                </AppText>
              ) : null}
            </View>
          ) : null}
        </View>

        {(isCompleting || isCompleted) && (
          <SessionAISummary
            summary={aiSummary.summary}
            isPolling={isCompleting || aiSummary.isPolling}
            fallbackText={fallbackSummaryText}
          />
        )}

        <PerExerciseList
          plannedExercises={plannedExercises}
          exercisesById={exercisesById}
          achievements={achievements}
          setLogs={setLogs}
        />

        {!isCompleted && <PostNotesInput value={postNotes} onChange={setPostNotes} />}

        {(isCompleting || isCompleted) && (
          <SessionRecommendations
            recommendations={recommendations ?? []}
            exercisesById={exercisesById}
            isLoading={isCompleting}
            userId={isCompleted ? userId : undefined}
          />
        )}
      </ScrollView>

      <View className="px-4 pb-8 pt-3 border-t" style={{ borderTopColor: colors.border }}>
        {isCompleted ? (
          <Pressable
            onPress={handleGoHome}
            style={{ minHeight: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14 }}
            className="bg-accent"
            accessibilityLabel="Terminer"
            testID="go-home-button"
          >
            <AppText style={{ fontSize: 17, fontWeight: '700', color: colors.contentPrimary }}>
              Terminer
            </AppText>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleFinish}
            disabled={isCompleting}
            style={{ minHeight: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14 }}
            className="bg-accent"
            accessibilityLabel="Terminer la séance"
            testID="finish-session-button"
          >
            <AppText style={{ fontSize: 17, fontWeight: '700', color: colors.contentPrimary }}>
              {isCompleting ? 'Enregistrement…' : 'Terminer'}
            </AppText>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
