import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSessionStore } from '@/stores/session-store';
import { useSessionExercises } from '@/hooks/use-session-exercises';
import {
  computeExerciseAchievements,
  computeSessionScores,
  performanceScoreLabel,
} from '@/services/session-scores';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { Recommendation } from '@/types';
import { useCompleteSession } from '../hooks/use-complete-session';
import {
  AchievementDot,
  formatDuration,
  ScoreRing,
  StatPill,
} from './session-score-ring';
import { SessionRecommendations } from './session-recommendations';

type CompletionState = 'idle' | 'completing' | 'completed';

const NOTE_MAX_LENGTH = 500;

export function EndSessionScreen() {
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setLogs = useSessionStore((s) => s.setLogs);
  const plannedExercises = useSessionStore((s) => s.plannedExercises);
  const reset = useSessionStore((s) => s.reset);

  const { complete, isCompleting, isCompleted, rulesResult } = useCompleteSession();
  const completionState: CompletionState = isCompleted ? 'completed' : isCompleting ? 'completing' : 'idle';

  const [postNotes, setPostNotes] = useState(session?.postSessionNotes ?? '');
  const recommendations: Recommendation[] | null = rulesResult?.recommendations ?? (isCompleted ? [] : null);

  const { data: exerciseData } = useSessionExercises(
    plannedExercises,
    session?.workoutDayId ?? null
  );
  const exercisesById = exerciseData?.exercisesById ?? new Map();

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
      ? '#22c55e'
      : scores.performance_score >= 6
        ? '#3b82f6'
        : scores.performance_score >= 4
          ? '#f59e0b'
          : scores.performance_score >= 2
            ? '#f97316'
            : '#ef4444';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
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

        {plannedExercises.length > 0 && (
          <View className="rounded-card overflow-hidden" style={{ backgroundColor: '#111827' }}>
            <View className="px-4 pt-4 pb-2">
              <AppText className="text-label font-semibold text-content-secondary tracking-wide">
                PAR EXERCICE
              </AppText>
            </View>
            {plannedExercises.map((pe, idx) => {
              const exercise = exercisesById.get(pe.exerciseId);
              const name = exercise?.nameFr ?? exercise?.name ?? pe.exerciseId;
              const achievement = achievements.find((a) => a.plannedExerciseId === pe.id);
              const logsCount = setLogs.filter(
                (sl) => sl.plannedExerciseId === pe.id && sl.completed
              ).length;
              return (
                <View
                  key={pe.id}
                  className="flex-row items-center px-4 py-3 gap-3"
                  style={
                    idx < plannedExercises.length - 1
                      ? { borderBottomWidth: 1, borderBottomColor: '#1e2a45' }
                      : undefined
                  }
                >
                  <AchievementDot achievement={achievement?.target_achievement ?? 0} />
                  <AppText className="flex-1 text-body text-content-primary" numberOfLines={1}>
                    {name}
                  </AppText>
                  <AppText className="text-label text-content-muted">
                    {logsCount}/{pe.sets}
                  </AppText>
                </View>
              );
            })}
          </View>
        )}

        {!isCompleted && (
          <View className="gap-2">
            <AppText className="text-label font-semibold text-content-secondary tracking-wide">
              NOTES DE FIN DE SÉANCE
            </AppText>
            <TextInput
              value={postNotes}
              onChangeText={(v) => setPostNotes(v.slice(0, NOTE_MAX_LENGTH))}
              multiline
              numberOfLines={3}
              returnKeyType="default"
              style={{
                minHeight: 80,
                fontSize: 15,
                color: colors.contentPrimary,
                backgroundColor: '#111827',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#1e2a45',
                paddingHorizontal: 12,
                paddingVertical: 10,
                textAlignVertical: 'top',
              }}
              placeholderTextColor={colors.contentMuted}
              placeholder="Comment s'est passée la séance ?"
              accessibilityLabel="Notes de fin de séance"
              testID="post-session-notes-input"
              onBlur={() => Keyboard.dismiss()}
            />
            <AppText className="text-caption text-content-muted text-right">
              {postNotes.length}/{NOTE_MAX_LENGTH}
            </AppText>
          </View>
        )}

        {(isCompleting || isCompleted) && (
          <SessionRecommendations
            recommendations={recommendations ?? []}
            exercisesById={exercisesById}
            isLoading={isCompleting}
          />
        )}
      </ScrollView>

      <View className="px-4 pb-8 pt-3 border-t" style={{ borderTopColor: '#1e2a45' }}>
        {isCompleted ? (
          <Pressable
            onPress={handleGoHome}
            style={{ minHeight: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14 }}
            className="bg-accent"
            accessibilityLabel="Retour à l'accueil"
            testID="go-home-button"
          >
            <AppText style={{ fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
              Retour à l&apos;accueil
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
            <AppText style={{ fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
              {isCompleting ? 'Enregistrement…' : 'Terminer'}
            </AppText>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
