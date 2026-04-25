import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDB } from '@/hooks/use-db';
import { useLastSetForExercise } from '@/hooks/use-last-set-for-exercise';
import { useSessionExercises } from '@/hooks/use-session-exercises';
import { useSessionStore } from '@/stores/session-store';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { PlannedExercise, SetLog } from '@/types';

// ---------------------------------------------------------------------------
// Session elapsed timer
// ---------------------------------------------------------------------------

function useElapsedTime(startedAt: string | null): string {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const start = new Date(startedAt).getTime();

    function tick() {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Rep color feedback (vs target)
// ---------------------------------------------------------------------------

function repsColor(actual: number | null, target: number | null): string {
  if (actual === null || target === null) return colors.contentSecondary;
  if (actual >= target) return '#22c55e';
  if (actual >= target - 1) return '#f97316';
  return '#ef4444';
}

// ---------------------------------------------------------------------------
// SetRow — one logged set line
// ---------------------------------------------------------------------------

type SetRowProps = {
  setNumber: number;
  log: SetLog | null;
  targetLoad: number | null;
  targetReps: number | null;
  targetRir: number | null;
  isCurrent: boolean;
};

function SetRow({
  setNumber,
  log,
  targetLoad,
  targetReps,
  targetRir,
  isCurrent,
}: SetRowProps) {
  const isLogged = log !== null && log.completed;

  const rowBg = isCurrent
    ? 'bg-background-elevated border border-accent'
    : isLogged
    ? 'bg-background-surface opacity-60'
    : 'bg-background-surface';

  const loadDisplay = isLogged
    ? log.load !== null
      ? String(log.load)
      : '—'
    : targetLoad !== null
    ? String(targetLoad)
    : '—';

  const repsDisplay = isLogged
    ? log.reps !== null
      ? String(log.reps)
      : '—'
    : targetReps !== null
    ? `${targetReps}`
    : '—';

  const rirDisplay = isLogged
    ? log.rir !== null
      ? String(log.rir)
      : '—'
    : targetRir !== null
    ? String(targetRir)
    : '—';

  const repColor = isLogged
    ? repsColor(log?.reps ?? null, targetReps)
    : colors.contentSecondary;

  return (
    <View
      className={`flex-row items-center rounded-card px-4 py-3 mb-2 ${rowBg}`}
    >
      <View className="w-8 items-center">
        {isLogged ? (
          <AppText className="text-status-success text-body font-semibold">
            ✓
          </AppText>
        ) : (
          <AppText
            className={`text-body font-semibold ${
              isCurrent ? 'text-accent' : 'text-content-muted'
            }`}
          >
            {setNumber}
          </AppText>
        )}
      </View>

      <View className="flex-1 items-center">
        <AppText
          className={`text-logger font-semibold ${
            isLogged ? 'text-content-primary' : 'text-content-muted'
          }`}
        >
          {loadDisplay}
        </AppText>
        <AppText className="text-caption text-content-muted">kg</AppText>
      </View>

      <View className="flex-1 items-center">
        <AppText
          className="text-logger font-semibold"
          style={{ color: isLogged ? repColor : colors.contentMuted }}
        >
          {repsDisplay}
        </AppText>
        <AppText className="text-caption text-content-muted">reps</AppText>
      </View>

      <View className="w-12 items-center">
        <AppText
          className={`text-body font-medium ${
            isLogged ? 'text-content-secondary' : 'text-content-muted'
          }`}
        >
          {rirDisplay}
        </AppText>
        <AppText className="text-caption text-content-muted">RIR</AppText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// RIR quick-select
// ---------------------------------------------------------------------------

const RIR_OPTIONS = [0, 1, 2, 3, 4, 5];

function RirSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <View className="flex-row gap-2">
      {RIR_OPTIONS.map((opt) => (
        <Pressable
          key={opt}
          onPress={() => onChange(opt)}
          className={`flex-1 h-tap items-center justify-center rounded-button border ${
            value === opt
              ? 'bg-accent border-accent'
              : 'bg-background-surface border-border'
          }`}
          accessibilityLabel={`RIR ${opt}`}
        >
          <AppText
            className={`text-label font-semibold ${
              value === opt ? 'text-content-on-accent' : 'text-content-secondary'
            }`}
          >
            {opt}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// LogSetForm — input area for the current set
// ---------------------------------------------------------------------------

type LogSetFormProps = {
  plannedExercise: PlannedExercise;
  prefillLoad: number | null;
  prefillReps: number | null;
  prefillRir: number | null;
  onLog: (load: number | null, reps: number | null, rir: number | null) => void;
  disabled: boolean;
};

function LogSetForm({
  plannedExercise,
  prefillLoad,
  prefillReps,
  prefillRir,
  onLog,
  disabled,
}: LogSetFormProps) {
  const loadRef = useRef<TextInput>(null);
  const repsRef = useRef<TextInput>(null);

  const [load, setLoad] = useState<string>(
    prefillLoad !== null ? String(prefillLoad) : ''
  );
  const [reps, setReps] = useState<string>(
    prefillReps !== null ? String(prefillReps) : ''
  );
  const [rir, setRir] = useState<number | null>(prefillRir);

  useEffect(() => {
    setLoad(prefillLoad !== null ? String(prefillLoad) : '');
    setReps(prefillReps !== null ? String(prefillReps) : '');
    setRir(prefillRir);
  }, [prefillLoad, prefillReps, prefillRir]);

  const parsedLoad = load.length > 0 ? parseFloat(load) : null;
  const parsedReps = reps.length > 0 ? parseInt(reps, 10) : null;

  const canLog =
    !disabled &&
    parsedLoad !== null &&
    !isNaN(parsedLoad) &&
    parsedReps !== null &&
    !isNaN(parsedReps) &&
    parsedReps > 0;

  function handleLog() {
    if (!canLog) {
      if (parsedLoad === null || isNaN(parsedLoad as number)) {
        loadRef.current?.focus();
        return;
      }
      if (parsedReps === null || isNaN(parsedReps as number)) {
        repsRef.current?.focus();
        return;
      }
      return;
    }
    Keyboard.dismiss();
    onLog(parsedLoad, parsedReps, rir);
    const nextLoad = parsedLoad !== null ? String(parsedLoad) : '';
    setLoad(nextLoad);
    setReps(
      plannedExercise.repRangeMin !== null
        ? String(plannedExercise.repRangeMin)
        : ''
    );
  }

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <View className="flex-1 gap-1">
          <AppText className="text-label text-content-secondary text-center">
            Charge (kg)
          </AppText>
          <TextInput
            ref={loadRef}
            value={load}
            onChangeText={setLoad}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => repsRef.current?.focus()}
            selectTextOnFocus
            className="h-22 rounded-card bg-background-surface border border-border text-display text-content-primary text-center font-bold"
            style={{ fontSize: 32, fontWeight: '700' }}
            placeholderTextColor={colors.contentMuted}
            placeholder="—"
            accessibilityLabel="Charge en kg"
            testID="load-input"
          />
        </View>

        <View className="flex-1 gap-1">
          <AppText className="text-label text-content-secondary text-center">
            Reps
          </AppText>
          <TextInput
            ref={repsRef}
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={handleLog}
            selectTextOnFocus
            className="h-22 rounded-card bg-background-surface border border-border text-display text-content-primary text-center font-bold"
            style={{ fontSize: 32, fontWeight: '700' }}
            placeholderTextColor={colors.contentMuted}
            placeholder="—"
            accessibilityLabel="Nombre de répétitions"
            testID="reps-input"
          />
        </View>
      </View>

      <View className="gap-2">
        <AppText className="text-label text-content-secondary">
          RIR (répétitions en réserve)
        </AppText>
        <RirSelector value={rir} onChange={setRir} />
      </View>

      <Pressable
        onPress={handleLog}
        disabled={!canLog}
        className={`h-18 rounded-button items-center justify-center ${
          canLog ? 'bg-accent' : 'bg-background-elevated'
        }`}
        accessibilityLabel="Logger le set"
        testID="log-set-button"
      >
        <AppText
          className={`text-heading font-bold ${
            canLog ? 'text-content-on-accent' : 'text-content-muted'
          }`}
        >
          LOG SET
        </AppText>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// ExerciseHeader — current exercise info
// ---------------------------------------------------------------------------

type ExerciseHeaderProps = {
  name: string;
  primaryMuscles: string[];
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRir: number | null;
  targetLoad: number | null;
};

function ExerciseHeader({
  name,
  primaryMuscles,
  sets,
  repRangeMin,
  repRangeMax,
  targetRir,
  targetLoad,
}: ExerciseHeaderProps) {
  const musclesLabel = primaryMuscles.slice(0, 3).join(', ');

  return (
    <View className="gap-2 pb-4 border-b border-border">
      <Pressable
        onPress={() => console.warn('TODO TA-15: ouvrir fiche exercice en modal')}
        accessibilityLabel={`Voir la fiche de ${name}`}
        accessibilityRole="button"
      >
        <AppText
          className="text-heading font-bold text-content-primary"
          numberOfLines={2}
        >
          {name}
        </AppText>
      </Pressable>

      {musclesLabel ? (
        <AppText className="text-caption text-content-secondary uppercase tracking-wide">
          {musclesLabel}
        </AppText>
      ) : null}

      <View className="flex-row gap-4 mt-1">
        <View className="flex-row items-baseline gap-1">
          <AppText className="text-logger font-bold text-content-primary">
            {targetLoad ?? '—'}
          </AppText>
          <AppText className="text-caption text-content-muted">kg</AppText>
        </View>

        <View className="flex-row items-baseline gap-1">
          <AppText className="text-logger font-bold text-content-primary">
            {sets}×{repRangeMin}
            {repRangeMin !== repRangeMax ? `–${repRangeMax}` : ''}
          </AppText>
        </View>

        {targetRir !== null ? (
          <View className="flex-row items-baseline gap-1">
            <AppText className="text-body font-semibold text-accent">
              RIR {targetRir}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// SessionHeader — top bar
// ---------------------------------------------------------------------------

type SessionHeaderProps = {
  sessionName: string;
  elapsed: string;
  exerciseIndex: number;
  exerciseCount: number;
};

function SessionHeader({
  sessionName,
  elapsed,
  exerciseIndex,
  exerciseCount,
}: SessionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-background-surface border-b border-border">
      <AppText className="text-label text-content-secondary flex-1" numberOfLines={1}>
        {sessionName}
      </AppText>

      <View className="flex-row items-center gap-3">
        <AppText className="text-label font-semibold text-accent">
          {exerciseIndex + 1}/{exerciseCount}
        </AppText>
        <AppText className="text-label font-mono text-content-secondary">
          {elapsed}
        </AppText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function SessionLiveScreen() {
  const router = useRouter();
  const db = useDB();

  const session = useSessionStore((s) => s.session);
  const plannedExercises = useSessionStore((s) => s.plannedExercises);
  const setLogs = useSessionStore((s) => s.setLogs);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const logSet = useSessionStore((s) => s.logSet);
  const completeSession = useSessionStore((s) => s.completeSession);

  const elapsed = useElapsedTime(session?.startedAt ?? null);

  const { data: sessionExercisesData } = useSessionExercises(
    plannedExercises,
    session?.workoutDayId ?? null
  );
  const exercisesById = sessionExercisesData?.exercisesById ?? new Map();
  const workoutDay = sessionExercisesData?.workoutDay ?? null;

  const currentPlanned: PlannedExercise | null =
    plannedExercises[currentExerciseIndex] ?? null;

  const currentExerciseSetLogs = useMemo(() => {
    if (!currentPlanned) return [];
    return setLogs.filter((sl) => sl.exerciseId === currentPlanned.exerciseId);
  }, [setLogs, currentPlanned]);

  const { lastSet } = useLastSetForExercise(
    currentPlanned?.exerciseId ?? null,
    session?.id
  );

  const nextSetNumber = currentExerciseSetLogs.length + 1;

  const prefillLoad = useMemo(() => {
    const lastLogged = currentExerciseSetLogs.at(-1);
    if (lastLogged?.load !== null && lastLogged?.load !== undefined) {
      return lastLogged.load;
    }
    if (lastSet?.load !== null && lastSet?.load !== undefined) {
      return lastSet.load;
    }
    return null;
  }, [currentExerciseSetLogs, lastSet]);

  const prefillReps = useMemo(() => {
    const lastLogged = currentExerciseSetLogs.at(-1);
    if (lastLogged?.reps !== null && lastLogged?.reps !== undefined) {
      return lastLogged.reps;
    }
    if (lastSet?.reps !== null && lastSet?.reps !== undefined) {
      return lastSet.reps;
    }
    if (currentPlanned) return currentPlanned.repRangeMin;
    return null;
  }, [currentExerciseSetLogs, lastSet, currentPlanned]);

  const prefillRir = useMemo(() => {
    const lastLogged = currentExerciseSetLogs.at(-1);
    if (lastLogged?.rir !== null && lastLogged?.rir !== undefined) {
      return lastLogged.rir;
    }
    if (lastSet?.rir !== null && lastSet?.rir !== undefined) {
      return lastSet.rir;
    }
    return currentPlanned?.targetRir ?? null;
  }, [currentExerciseSetLogs, lastSet, currentPlanned]);

  const allSetsLogged =
    currentPlanned !== null &&
    currentExerciseSetLogs.filter((sl) => sl.completed).length >=
      currentPlanned.sets;

  const handleLogSet = useCallback(
    (load: number | null, reps: number | null, rir: number | null) => {
      if (!currentPlanned || !session) return;

      logSet(db, {
        plannedExerciseId: currentPlanned.id,
        exerciseId: currentPlanned.exerciseId,
        setNumber: nextSetNumber,
        load,
        reps,
        rir,
        completed: true,
      });
    },
    [db, currentPlanned, session, logSet, nextSetNumber]
  );

  const handleEndSession = useCallback(async () => {
    await completeSession(db);
    router.replace('/(app)');
  }, [completeSession, db, router]);

  if (!session) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <AppText variant="body" className="text-content-secondary">
          Aucune séance en cours.
        </AppText>
      </SafeAreaView>
    );
  }

  const sessionName = workoutDay?.title ?? 'Séance';

  const currentExercise = currentPlanned
    ? exercisesById.get(currentPlanned.exerciseId) ?? null
    : null;

  // prefillLoad = dernière charge loggée (séance en cours ou séance précédente).
  // Il ne s'agit PAS d'un targetLoad prescrit par le moteur de progression —
  // cette valeur est un fallback pratique pour pré-remplir le champ.
  // TA-prog: quand le moteur calculera une charge cible, elle proviendra de
  // PlannedExercise.targetLoad (champ à ajouter) et sera prioritaire ici.
  const targetLoadForCurrentExercise = prefillLoad;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <SessionHeader
        sessionName={sessionName}
        elapsed={elapsed}
        exerciseIndex={currentExerciseIndex}
        exerciseCount={plannedExercises.length || 1}
      />

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-6 gap-4"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {currentPlanned ? (
          <>
            <ExerciseHeader
              name={
                currentExercise?.nameFr ?? currentExercise?.name
                  ?? `Exercice ${currentExerciseIndex + 1}`
              }
              primaryMuscles={currentExercise?.primaryMuscles ?? []}
              sets={currentPlanned.sets}
              repRangeMin={currentPlanned.repRangeMin}
              repRangeMax={currentPlanned.repRangeMax}
              targetRir={currentPlanned.targetRir}
              targetLoad={targetLoadForCurrentExercise}
            />

            <View className="gap-1">
              <View className="flex-row px-4 mb-1">
                <View className="w-8" />
                <AppText className="flex-1 text-caption text-content-muted text-center">
                  Charge
                </AppText>
                <AppText className="flex-1 text-caption text-content-muted text-center">
                  Reps
                </AppText>
                <AppText className="w-12 text-caption text-content-muted text-center">
                  RIR
                </AppText>
              </View>

              {Array.from({ length: currentPlanned.sets }, (_, i) => {
                const setNum = i + 1;
                const log =
                  currentExerciseSetLogs.find(
                    (sl) => sl.setNumber === setNum
                  ) ?? null;
                const isCurrent =
                  !allSetsLogged && setNum === nextSetNumber;

                return (
                  <SetRow
                    key={setNum}
                    setNumber={setNum}
                    log={log}
                    targetLoad={prefillLoad}
                    targetReps={currentPlanned.repRangeMin}
                    targetRir={currentPlanned.targetRir}
                    isCurrent={isCurrent}
                  />
                );
              })}
            </View>

            {!allSetsLogged ? (
              <LogSetForm
                plannedExercise={currentPlanned}
                prefillLoad={prefillLoad}
                prefillReps={prefillReps}
                prefillRir={prefillRir}
                onLog={handleLogSet}
                disabled={false}
              />
            ) : (
              <View className="bg-background-elevated rounded-card px-4 py-4 items-center gap-2">
                <AppText className="text-status-success text-heading font-bold">
                  Tous les sets terminés
                </AppText>
                <AppText className="text-caption text-content-secondary">
                  Navigue vers l'exercice suivant ou termine la séance.
                </AppText>
              </View>
            )}
          </>
        ) : (
          <View className="flex-1 items-center justify-center py-12 gap-3">
            <AppText variant="heading" className="text-content-primary text-center">
              Séance libre
            </AppText>
            <AppText variant="body" className="text-content-secondary text-center">
              Aucun exercice planifié pour cette séance.
            </AppText>
          </View>
        )}
      </ScrollView>

      <View className="px-4 pb-6 pt-2 gap-2 border-t border-border bg-background">
        <Pressable
          onPress={handleEndSession}
          className="h-14 rounded-button items-center justify-center bg-background-surface border border-border-strong"
          accessibilityLabel="Terminer la séance"
          testID="end-session-button"
        >
          <AppText className="text-label font-semibold text-content-secondary">
            Terminer la séance
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
