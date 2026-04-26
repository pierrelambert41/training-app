import { useCallback, useMemo, useState } from 'react';
import { ActionSheetIOS, Platform, Pressable, ScrollView, View } from 'react-native';
import { AppText } from '@/components/ui';
import { useLastSetForExercise } from '@/hooks/use-last-set-for-exercise';
import { useLastSetForExerciseSide } from '@/hooks/use-last-set-for-exercise-side';
import { useSessionStore } from '@/stores/session-store';
import type { EditSetPayload } from '@/stores/session-store';
import { buildVirtualRows } from '../lib/build-virtual-rows';
import { useExercisePagePrefill } from '../hooks/use-exercise-page-prefill';
import { ExerciseHeader } from './exercise-header';
import { SetRowList } from './set-row-list';
import { RestTimerAdjuster } from './rest-timer-adjuster';
import type { InlineLogValues } from './set-row-inline-form';
import type { Exercise, LogType, PlannedExercise, SetLog, SetLogSide } from '@/types';
import type { SQLiteDatabase } from 'expo-sqlite';

type ExercisePageProps = {
  plannedExercise: PlannedExercise;
  exerciseIndex: number;
  setLogs: SetLog[];
  exercisesById: Map<string, Exercise>;
  sessionId: string;
  db: SQLiteDatabase;
  onSkip: (exerciseId: string) => void;
};

export function ExercisePage({
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
  const updateExerciseRestSeconds = useSessionStore((s) => s.updateExerciseRestSeconds);

  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [noteSetId, setNoteSetId] = useState<string | null>(null);

  const exerciseMeta = exercisesById.get(plannedExercise.exerciseId) ?? null;
  const exerciseName =
    exerciseMeta?.nameFr ?? exerciseMeta?.name ?? `Exercice ${exerciseIndex + 1}`;
  const logType: LogType = exerciseMeta?.logType ?? 'weight_reps';
  const isUnilateral = exerciseMeta?.isUnilateral ?? false;

  const exerciseSetLogs = useMemo(
    () => setLogs.filter((sl) => sl.exerciseId === plannedExercise.exerciseId),
    [setLogs, plannedExercise.exerciseId]
  );

  const { lastSet } = useLastSetForExercise(
    isUnilateral ? null : plannedExercise.exerciseId,
    sessionId
  );
  const { lastSetLeft, lastSetRight } = useLastSetForExerciseSide(
    isUnilateral ? plannedExercise.exerciseId : null,
    sessionId
  );

  const virtualRows = useMemo(
    () => buildVirtualRows(plannedExercise.sets, isUnilateral, exerciseSetLogs),
    [plannedExercise.sets, isUnilateral, exerciseSetLogs]
  );

  const completedCount = exerciseSetLogs.filter((sl) => sl.completed).length;
  const totalExpected = isUnilateral ? plannedExercise.sets * 2 : plannedExercise.sets;
  const allSetsLogged = completedCount >= totalExpected;

  const nextVirtual = useMemo(
    () => virtualRows.find((r) => r.log === null || !r.log.completed) ?? null,
    [virtualRows]
  );

  const currentSide = nextVirtual?.side ?? null;
  const currentSetNumber = nextVirtual?.setNumber ?? plannedExercise.sets + 1;

  const { prefillLoad, prefillReps, prefillRir, prefillDuration, prefillDistance } =
    useExercisePagePrefill({
      exerciseSetLogs,
      editingSetId,
      currentSide,
      lastSet,
      lastSetLeft,
      lastSetRight,
      repRangeMin: plannedExercise.repRangeMin,
      targetRir: plannedExercise.targetRir ?? null,
    });

  const handleInlineLog = useCallback(
    (values: InlineLogValues) => {
      logSet(db, {
        plannedExerciseId: plannedExercise.id,
        exerciseId: plannedExercise.exerciseId,
        setNumber: currentSetNumber,
        load: values.load,
        reps: values.reps,
        rir: values.rir ?? (plannedExercise.targetRir ?? null),
        durationSeconds: values.durationSeconds,
        distanceMeters: values.distanceMeters,
        completed: true,
        side: values.side,
      });
      startRestTimer(plannedExercise.restSeconds ?? 90, exerciseName);
    },
    [db, plannedExercise, logSet, currentSetNumber, startRestTimer, exerciseName]
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

  const handleRestAdjust = useCallback(
    (newRestSeconds: number) => {
      updateExerciseRestSeconds(db, plannedExercise.id, newRestSeconds);
    },
    [db, plannedExercise.id, updateExerciseRestSeconds]
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
        targetLoad={logType === 'weight_reps' ? prefillLoad : null}
      />

      <SetRowList
        virtualRows={virtualRows}
        allSetsLogged={allSetsLogged}
        nextVirtual={nextVirtual}
        logType={logType}
        prefillLoad={prefillLoad}
        targetReps={plannedExercise.repRangeMin}
        targetRir={plannedExercise.targetRir}
        prefillReps={prefillReps}
        prefillDuration={prefillDuration}
        prefillDistance={prefillDistance}
        editingSetId={editingSetId}
        noteSetId={noteSetId}
        exerciseSetLogs={exerciseSetLogs}
        db={db}
        onSetTap={(log, isEditing) => setEditingSetId(isEditing ? null : log.id)}
        onNoteTap={(logId) => setNoteSetId(logId)}
        onEditSave={handleEditSave}
        onEditDelete={handleEditDelete}
        onEditCancel={() => setEditingSetId(null)}
        onNoteClose={() => setNoteSetId(null)}
        onNoteSave={(note) => {
          if (noteSetId) editSet(db, noteSetId, { notes: note || null });
        }}
        onInlineLog={handleInlineLog}
      />

      <RestTimerAdjuster
        currentRestSeconds={plannedExercise.restSeconds ?? 90}
        onAdjust={handleRestAdjust}
      />

      {allSetsLogged ? (
        <View className="bg-background-elevated rounded-card px-4 py-4 items-center gap-2">
          <AppText className="text-status-success text-heading font-bold">
            Tous les sets terminés
          </AppText>
          <AppText className="text-caption text-content-secondary">
            Swipe pour passer à l'exercice suivant.
          </AppText>
        </View>
      ) : null}

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
