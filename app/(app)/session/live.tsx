import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Keyboard,
  Platform,
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
import type { EditSetPayload } from '@/stores/session-store';
import { AppText } from '@/components/ui';
import { RestTimer } from '@/components/session/RestTimer';
import { ExerciseDots } from '@/components/session/ExerciseDots';
import { ExercisePager } from '@/components/session/ExercisePager';
import { colors } from '@/theme/tokens';
import type { Exercise, PlannedExercise, SetLog } from '@/types';
import type { SQLiteDatabase } from 'expo-sqlite';

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
// SetRow — one logged set line (tappable when logged)
// ---------------------------------------------------------------------------

type SetRowProps = {
  setNumber: number;
  log: SetLog | null;
  targetLoad: number | null;
  targetReps: number | null;
  targetRir: number | null;
  isCurrent: boolean;
  isEditing: boolean;
  onTap: () => void;
};

function SetRow({
  setNumber,
  log,
  targetLoad,
  targetReps,
  targetRir,
  isCurrent,
  isEditing,
  onTap,
}: SetRowProps) {
  const isLogged = log !== null && log.completed;

  const rowBg = isEditing
    ? 'bg-background-elevated border border-accent'
    : isCurrent
    ? 'bg-background-elevated border border-border'
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

  const rowContent = (
    <View
      className={`flex-row items-center rounded-card px-4 py-3 mb-0 ${rowBg}`}
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

  if (!isLogged) {
    return <View className="mb-2">{rowContent}</View>;
  }

  return (
    <Pressable
      onPress={onTap}
      accessibilityLabel={`Modifier le set ${setNumber}`}
      accessibilityRole="button"
      style={{ minHeight: 44 }}
      className="mb-2"
    >
      {rowContent}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// InlineSetEditor — édition d'un set déjà loggé
// ---------------------------------------------------------------------------

type InlineSetEditorProps = {
  log: SetLog;
  targetReps: number | null;
  onSave: (payload: EditSetPayload) => void;
  onDelete: () => void;
  onCancel: () => void;
};

function InlineSetEditor({ log, targetReps, onSave, onDelete, onCancel }: InlineSetEditorProps) {
  const loadRef = useRef<TextInput>(null);
  const repsRef = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const [load, setLoad] = useState(log.load !== null ? String(log.load) : '');
  const [reps, setReps] = useState(log.reps !== null ? String(log.reps) : '');
  const [rir, setRir] = useState<number | null>(log.rir);
  const [notes, setNotes] = useState(log.notes ?? '');

  const parsedLoad = load.length > 0 ? parseFloat(load) : null;
  const parsedReps = reps.length > 0 ? parseInt(reps, 10) : null;

  const canSave =
    parsedLoad !== null &&
    !isNaN(parsedLoad) &&
    parsedReps !== null &&
    !isNaN(parsedReps) &&
    parsedReps > 0;

  function handleSave() {
    if (!canSave) return;
    Keyboard.dismiss();
    onSave({
      load: parsedLoad,
      reps: parsedReps,
      rir,
      notes: notes.trim() || null,
    });
  }

  function handleDeletePress() {
    Alert.alert(
      'Supprimer ce set ?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  }

  return (
    <View className="bg-background-elevated border border-accent rounded-card px-4 py-4 mb-2 gap-3">
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
            autoFocus
            className="h-14 rounded-card bg-background-surface border border-border text-xl text-content-primary text-center font-bold"
            style={{ fontSize: 22, fontWeight: '700' }}
            placeholderTextColor={colors.contentMuted}
            placeholder="—"
            accessibilityLabel="Charge en kg"
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
            onSubmitEditing={handleSave}
            selectTextOnFocus
            className="h-14 rounded-card bg-background-surface border border-border text-xl text-content-primary text-center font-bold"
            style={{ fontSize: 22, fontWeight: '700' }}
            placeholderTextColor={colors.contentMuted}
            placeholder="—"
            accessibilityLabel="Nombre de répétitions"
          />
        </View>
      </View>

      <View className="gap-1">
        <AppText className="text-label text-content-secondary">RIR</AppText>
        <RirSelector value={rir} onChange={setRir} />
      </View>

      <View className="gap-1">
        <AppText className="text-label text-content-secondary">Notes</AppText>
        <TextInput
          ref={notesRef}
          value={notes}
          onChangeText={setNotes}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          className="h-10 rounded-card bg-background-surface border border-border text-body text-content-primary px-3"
          style={{ fontSize: 14 }}
          placeholderTextColor={colors.contentMuted}
          placeholder="Optionnel…"
          accessibilityLabel="Notes sur le set"
        />
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={handleDeletePress}
          style={{ minHeight: 44, flex: 1 }}
          className="rounded-button items-center justify-center bg-background-surface border border-border"
          accessibilityLabel="Supprimer ce set"
        >
          <AppText className="text-label font-semibold text-status-error">
            Supprimer
          </AppText>
        </Pressable>

        <Pressable
          onPress={onCancel}
          style={{ minHeight: 44, flex: 1 }}
          className="rounded-button items-center justify-center bg-background-surface border border-border"
          accessibilityLabel="Annuler l'édition"
        >
          <AppText className="text-label font-semibold text-content-secondary">
            Annuler
          </AppText>
        </Pressable>

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={{ minHeight: 44, flex: 2 }}
          className={`rounded-button items-center justify-center ${
            canSave ? 'bg-accent' : 'bg-background-elevated'
          }`}
          accessibilityLabel="Valider les modifications"
        >
          <AppText
            className={`text-label font-bold ${
              canSave ? 'text-content-on-accent' : 'text-content-muted'
            }`}
          >
            Valider
          </AppText>
        </Pressable>
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
  previousSetLog: SetLog | null;
  onLog: (load: number | null, reps: number | null, rir: number | null) => void;
  disabled: boolean;
};

function LogSetForm({
  plannedExercise,
  prefillLoad,
  prefillReps,
  prefillRir,
  previousSetLog,
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

  function handleRepeatPrevious() {
    if (!previousSetLog) return;
    setLoad(previousSetLog.load !== null ? String(previousSetLog.load) : '');
    setReps(previousSetLog.reps !== null ? String(previousSetLog.reps) : '');
    setRir(previousSetLog.rir);
  }

  return (
    <View className="gap-4">
      {previousSetLog !== null ? (
        <Pressable
          onPress={handleRepeatPrevious}
          style={{ minHeight: 44 }}
          className="rounded-button items-center justify-center bg-background-surface border border-border flex-row gap-2"
          accessibilityLabel="Répéter le set précédent"
          testID="repeat-previous-button"
        >
          <AppText className="text-label font-semibold text-content-secondary">
            ↩ Repeat previous set
          </AppText>
          <AppText className="text-caption text-content-muted">
            {previousSetLog.load ?? '—'}kg × {previousSetLog.reps ?? '—'}
            {previousSetLog.rir !== null ? ` · RIR ${previousSetLog.rir}` : ''}
          </AppText>
        </Pressable>
      ) : null}

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
// ExercisePage — one page per planned exercise
// ---------------------------------------------------------------------------

type ExercisePageProps = {
  plannedExercise: PlannedExercise;
  exerciseIndex: number;
  setLogs: SetLog[];
  exercisesById: Map<string, Exercise>;
  sessionId: string;
  db: SQLiteDatabase;
  onSkip: (exerciseId: string) => void;
};

function ExercisePage({
  plannedExercise,
  exerciseIndex,
  setLogs,
  exercisesById,
  sessionId,
  db,
  onSkip,
}: ExercisePageProps) {
  const logSet = useSessionStore((s) => s.logSet);
  const editSet = useSessionStore((s) => s.editSet);
  const deleteSet = useSessionStore((s) => s.deleteSet);
  const startRestTimer = useSessionStore((s) => s.startRestTimer);

  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const exerciseMeta = exercisesById.get(plannedExercise.exerciseId) ?? null;
  const exerciseName =
    exerciseMeta?.nameFr ?? exerciseMeta?.name ?? `Exercice ${exerciseIndex + 1}`;

  const exerciseSetLogs = useMemo(
    () => setLogs.filter((sl) => sl.exerciseId === plannedExercise.exerciseId),
    [setLogs, plannedExercise.exerciseId]
  );

  const { lastSet } = useLastSetForExercise(plannedExercise.exerciseId, sessionId);

  const nextSetNumber = exerciseSetLogs.length + 1;

  const prefillLoad = useMemo(() => {
    const lastLogged = exerciseSetLogs.at(-1);
    if (lastLogged?.load !== null && lastLogged?.load !== undefined) return lastLogged.load;
    if (lastSet?.load !== null && lastSet?.load !== undefined) return lastSet.load;
    return null;
  }, [exerciseSetLogs, lastSet]);

  const prefillReps = useMemo(() => {
    const lastLogged = exerciseSetLogs.at(-1);
    if (lastLogged?.reps !== null && lastLogged?.reps !== undefined) return lastLogged.reps;
    if (lastSet?.reps !== null && lastSet?.reps !== undefined) return lastSet.reps;
    return plannedExercise.repRangeMin;
  }, [exerciseSetLogs, lastSet, plannedExercise.repRangeMin]);

  const prefillRir = useMemo(() => {
    const lastLogged = exerciseSetLogs.at(-1);
    if (lastLogged?.rir !== null && lastLogged?.rir !== undefined) return lastLogged.rir;
    if (lastSet?.rir !== null && lastSet?.rir !== undefined) return lastSet.rir;
    return plannedExercise.targetRir ?? null;
  }, [exerciseSetLogs, lastSet, plannedExercise.targetRir]);

  const allSetsLogged =
    exerciseSetLogs.filter((sl) => sl.completed).length >= plannedExercise.sets;

  const previousSetLog = exerciseSetLogs.length >= 1 ? exerciseSetLogs.at(-1) ?? null : null;

  const handleLogSet = useCallback(
    (load: number | null, reps: number | null, rir: number | null) => {
      logSet(db, {
        plannedExerciseId: plannedExercise.id,
        exerciseId: plannedExercise.exerciseId,
        setNumber: nextSetNumber,
        load,
        reps,
        rir,
        completed: true,
      });
      const restSeconds = plannedExercise.restSeconds ?? 90;
      startRestTimer(restSeconds, exerciseName);
    },
    [db, plannedExercise, logSet, nextSetNumber, startRestTimer, exerciseName]
  );

  const handleEditSave = useCallback(
    (setLogId: string, payload: EditSetPayload) => {
      editSet(db, setLogId, payload);
      setEditingSetId(null);
    },
    [db, editSet]
  );

  const handleEditDelete = useCallback(
    (setLogId: string) => {
      deleteSet(db, setLogId);
      setEditingSetId(null);
    },
    [db, deleteSet]
  );

  function handleSkipPress() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Annuler', 'Passer cet exercice'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          message: `Passer "${exerciseName}" sans logger de set ?`,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) onSkip(plannedExercise.exerciseId);
        }
      );
    } else {
      // MVP: Android has no native ActionSheet equivalent; skip directly without confirmation.
      onSkip(plannedExercise.exerciseId);
    }
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="px-4 pt-4 pb-6 gap-4"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <ExerciseHeader
        name={exerciseName}
        primaryMuscles={exerciseMeta?.primaryMuscles ?? []}
        sets={plannedExercise.sets}
        repRangeMin={plannedExercise.repRangeMin}
        repRangeMax={plannedExercise.repRangeMax}
        targetRir={plannedExercise.targetRir}
        targetLoad={prefillLoad}
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

        {Array.from({ length: plannedExercise.sets }, (_, i) => {
          const setNum = i + 1;
          const log = exerciseSetLogs.find((sl) => sl.setNumber === setNum) ?? null;
          const isCurrent = !allSetsLogged && setNum === nextSetNumber;
          const isEditing = log !== null && editingSetId === log.id;

          return (
            <View key={setNum}>
              <SetRow
                setNumber={setNum}
                log={log}
                targetLoad={prefillLoad}
                targetReps={plannedExercise.repRangeMin}
                targetRir={plannedExercise.targetRir}
                isCurrent={isCurrent}
                isEditing={isEditing}
                onTap={() => {
                  if (log && log.completed) {
                    setEditingSetId(isEditing ? null : log.id);
                  }
                }}
              />
              {isEditing && log ? (
                <InlineSetEditor
                  log={log}
                  targetReps={plannedExercise.repRangeMin}
                  onSave={(payload) => handleEditSave(log.id, payload)}
                  onDelete={() => handleEditDelete(log.id)}
                  onCancel={() => setEditingSetId(null)}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {!allSetsLogged ? (
        <LogSetForm
          plannedExercise={plannedExercise}
          prefillLoad={prefillLoad}
          prefillReps={prefillReps}
          prefillRir={prefillRir}
          previousSetLog={previousSetLog}
          onLog={handleLogSet}
          disabled={false}
        />
      ) : (
        <View className="bg-background-elevated rounded-card px-4 py-4 items-center gap-2">
          <AppText className="text-status-success text-heading font-bold">
            Tous les sets terminés
          </AppText>
          <AppText className="text-caption text-content-secondary">
            Swipe pour passer à l'exercice suivant.
          </AppText>
        </View>
      )}

      <Pressable
        onPress={handleSkipPress}
        hitSlop={8}
        style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
        accessibilityLabel="Passer cet exercice"
        testID="skip-exercise-button"
      >
        <AppText className="text-label text-content-muted underline">
          Passer cet exercice
        </AppText>
      </Pressable>
    </ScrollView>
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
  const skippedExerciseIds = useSessionStore((s) => s.skippedExerciseIds);
  const setCurrentExercise = useSessionStore((s) => s.setCurrentExercise);
  const skipExercise = useSessionStore((s) => s.skipExercise);
  const completeSession = useSessionStore((s) => s.completeSession);

  const elapsed = useElapsedTime(session?.startedAt ?? null);

  const { data: sessionExercisesData } = useSessionExercises(
    plannedExercises,
    session?.workoutDayId ?? null
  );
  const exercisesById = sessionExercisesData?.exercisesById ?? new Map();
  const workoutDay = sessionExercisesData?.workoutDay ?? null;

  const doneIndices = useMemo(() => {
    return plannedExercises
      .map((pe, i) => {
        const logsForExercise = setLogs.filter(
          (sl) => sl.exerciseId === pe.exerciseId && sl.completed
        );
        return logsForExercise.length >= pe.sets ? i : -1;
      })
      .filter((i) => i >= 0);
  }, [plannedExercises, setLogs]);

  const skippedIndices = useMemo(() => {
    return plannedExercises
      .map((pe, i) => (skippedExerciseIds.has(pe.exerciseId) ? i : -1))
      .filter((i) => i >= 0);
  }, [plannedExercises, skippedExerciseIds]);

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

  if (plannedExercises.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <SessionHeader
          sessionName={sessionName}
          elapsed={elapsed}
          exerciseIndex={0}
          exerciseCount={1}
        />
        <RestTimer />
        <View className="flex-1 items-center justify-center py-12 gap-3">
          <AppText variant="heading" className="text-content-primary text-center">
            Séance libre
          </AppText>
          <AppText variant="body" className="text-content-secondary text-center">
            Aucun exercice planifié pour cette séance.
          </AppText>
        </View>
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <SessionHeader
        sessionName={sessionName}
        elapsed={elapsed}
        exerciseIndex={currentExerciseIndex}
        exerciseCount={plannedExercises.length}
      />
      <RestTimer />

      <ExerciseDots
        count={plannedExercises.length}
        currentIndex={currentExerciseIndex}
        doneIndices={doneIndices}
        skippedIndices={skippedIndices}
        onPress={setCurrentExercise}
      />

      <ExercisePager
        currentIndex={currentExerciseIndex}
        count={plannedExercises.length}
        onPageChange={setCurrentExercise}
        renderPage={(i) => {
          const pe = plannedExercises[i];
          if (!pe) return null;
          return (
            <ExercisePage
              key={pe.id}
              plannedExercise={pe}
              exerciseIndex={i}
              setLogs={setLogs}
              exercisesById={exercisesById}
              sessionId={session.id}
              db={db}
              onSkip={skipExercise}
            />
          );
        }}
      />

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
