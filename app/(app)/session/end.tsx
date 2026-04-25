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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDB } from '@/hooks/use-db';
import { useSessionStore } from '@/stores/session-store';
import { useSessionExercises } from '@/hooks/use-session-exercises';
import {
  computeExerciseAchievements,
  computeSessionScores,
  performanceScoreLabel,
} from '@/services/session-scores';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Score ring — SVG-free progress arc via rotating borders
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const pct = score / 10;

  const ringColor = useMemo(() => {
    if (score >= 8) return '#22c55e';
    if (score >= 6) return '#3b82f6';
    if (score >= 4) return '#f59e0b';
    if (score >= 2) return '#f97316';
    return '#ef4444';
  }, [score]);

  return (
    <View className="items-center justify-center" style={{ width: 160, height: 160 }}>
      <View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 10,
          borderColor: '#1e2a45',
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 10,
          borderColor: ringColor,
          borderRightColor: pct >= 0.25 ? ringColor : '#1e2a45',
          borderBottomColor: pct >= 0.5 ? ringColor : '#1e2a45',
          borderLeftColor: pct >= 0.75 ? ringColor : '#1e2a45',
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
          opacity: 0.9,
        }}
      />
      <View className="items-center gap-0.5">
        <AppText style={{ fontSize: 52, fontWeight: '800', color: ringColor, lineHeight: 58 }}>
          {score.toFixed(1)}
        </AppText>
        <AppText className="text-label text-content-secondary">/10</AppText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Achievement indicator dot
// ---------------------------------------------------------------------------

function AchievementDot({ achievement }: { achievement: number }) {
  const color =
    achievement >= 1 ? '#22c55e' : achievement >= 0.7 ? '#f59e0b' : '#ef4444';
  return (
    <View
      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }}
    />
  );
}

// ---------------------------------------------------------------------------
// Stat counter pill
// ---------------------------------------------------------------------------

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-1 items-center py-3 rounded-card"
      style={{ backgroundColor: '#111827' }}
    >
      <AppText style={{ fontSize: 22, fontWeight: '700', color: colors.contentPrimary }}>
        {value}
      </AppText>
      <AppText className="text-caption text-content-muted mt-0.5">{label}</AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Duration formatter
// ---------------------------------------------------------------------------

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const secs = Math.floor((end - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}min`;
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

const NOTE_MAX_LENGTH = 500;

export default function SessionEndScreen() {
  const db = useDB();
  const router = useRouter();
  const session = useSessionStore((s) => s.session);
  const setLogs = useSessionStore((s) => s.setLogs);
  const plannedExercises = useSessionStore((s) => s.plannedExercises);
  const completeSession = useSessionStore((s) => s.completeSession);
  const updateSessionNotes = useSessionStore((s) => s.updateSessionNotes);
  const reset = useSessionStore((s) => s.reset);

  const [postNotes, setPostNotes] = useState(session?.postSessionNotes ?? '');
  const [saving, setSaving] = useState(false);

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

  const completedExercises = useMemo(() => {
    return plannedExercises.filter((pe) => {
      const done = setLogs.filter(
        (sl) => sl.plannedExerciseId === pe.id && sl.completed
      ).length;
      return done >= pe.sets;
    }).length;
  }, [plannedExercises, setLogs]);

  const completedPlannedSets = setLogs.filter(
    (sl) => sl.plannedExerciseId !== null && sl.completed
  ).length;

  const missingPlannedSets =
    totalPlannedSets > 0 ? totalPlannedSets - completedPlannedSets : 0;

  useEffect(() => {
    if (!session) {
      router.replace('/(app)');
    }
  }, [session, router]);

  const doFinish = useCallback(async () => {
    if (!session) return;
    setSaving(true);
    try {
      if (postNotes !== (session.postSessionNotes ?? '')) {
        updateSessionNotes(db, session.preSessionNotes, postNotes.trim() || null);
      }
      await completeSession(db);
      reset();
      router.replace('/(app)');
    } finally {
      setSaving(false);
    }
  }, [session, postNotes, updateSessionNotes, db, completeSession, reset, router]);

  const handleFinish = useCallback(async () => {
    if (!session) return;

    if (missingPlannedSets > 0) {
      Alert.alert(
        'Sets non loggés',
        `${missingPlannedSets} set${missingPlannedSets > 1 ? 's' : ''} non loggé${missingPlannedSets > 1 ? 's' : ''} — terminer quand même ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Terminer',
            style: 'destructive',
            onPress: () => void doFinish(),
          },
        ]
      );
      return;
    }
    await doFinish();
  }, [session, missingPlannedSets, doFinish]);

  if (!session || !scores) return null;

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
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="pt-6 pb-2 items-center gap-1">
            <AppText style={{ fontSize: 18, fontWeight: '600', color: colors.contentSecondary }}>
              Séance terminée
            </AppText>
          </View>

          {/* Score ring */}
          <View className="items-center py-2 gap-3">
            <ScoreRing score={scores.performance_score} />
            <AppText style={{ fontSize: 24, fontWeight: '700', color: scoreColor }}>
              {label}
            </AppText>
          </View>

          {/* Stats row */}
          <View className="flex-row gap-3">
            <StatPill
              label="Sets"
              value={`${completedSets}/${totalPlannedSets > 0 ? totalPlannedSets : completedSets}`}
            />
            <StatPill
              label="Exercices"
              value={`${completedExercises}/${plannedExercises.filter((pe) => !pe.isUnplanned).length || completedExercises}`}
            />
            <StatPill
              label="Durée"
              value={finalDuration}
            />
          </View>

          {/* Exercise breakdown */}
          {plannedExercises.length > 0 && (
            <View
              className="rounded-card overflow-hidden"
              style={{ backgroundColor: '#111827' }}
            >
              <View className="px-4 pt-4 pb-2">
                <AppText className="text-label font-semibold text-content-secondary tracking-wide">
                  PAR EXERCICE
                </AppText>
              </View>
              {plannedExercises.map((pe, idx) => {
                const exercise = exercisesById.get(pe.exerciseId);
                const name = exercise?.nameFr ?? exercise?.name ?? pe.exerciseId;
                const achievement = achievements.find(
                  (a) => a.plannedExerciseId === pe.id
                );
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
                    <AppText
                      className="flex-1 text-body text-content-primary"
                      numberOfLines={1}
                    >
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

          {/* Post-session notes */}
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
        </ScrollView>

        {/* CTA */}
        <View
          className="px-4 pb-8 pt-3 border-t"
          style={{ borderTopColor: '#1e2a45' }}
        >
          <Pressable
            onPress={handleFinish}
            disabled={saving}
            style={{ minHeight: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 14 }}
            className="bg-accent"
            accessibilityLabel="Terminer la séance"
            testID="finish-session-button"
          >
            <AppText style={{ fontSize: 17, fontWeight: '700', color: '#ffffff' }}>
              {saving ? 'Enregistrement…' : 'Terminer'}
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
