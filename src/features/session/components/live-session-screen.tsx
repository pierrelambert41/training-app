/**
 * LiveSessionScreen — orchestrateur de l'écran de séance en cours.
 *
 * Responsabilités :
 * - Lire l'état global de la séance depuis useSessionStore (session, plannedExercises, setLogs, indices)
 * - Dériver l'état calculé localement (doneIndices, skippedIndices, sessionName, hasSessionNotes)
 * - Gérer les états UI de niveau screen : visibilité du picker d'exercice, de la modal de config, des notes de séance
 * - Orchestrer les actions store : addUnplannedExercise, skipExercise, abandonSession
 * - Déléguer le rendu à SessionHeader, ExercisePage, ExerciseDots, ExercisePager, modals
 *
 * Ce fichier NE doit PAS contenir de logique métier (dans domain/), de JSX de set logging, ni d'I/O directe.
 */

import { useCallback, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { generateUUID } from '@/utils/uuid';
import { useDB } from '@/hooks/use-db';
import { useSessionExercises } from '@/hooks/use-session-exercises';
import { useSessionStore } from '@/stores/session-store';
import { AppText } from '@/components/ui';
import { RestTimer } from '@/components/session/RestTimer';
import { ExerciseDots } from '@/components/session/ExerciseDots';
import { ExercisePager } from '@/components/session/ExercisePager';
import { useElapsedTime } from '../hooks/use-elapsed-time';
import { SessionHeader } from './session-header';
import { SessionFooterActions } from './session-footer-actions';
import { SharedSessionModals } from './shared-session-modals';
import { ExercisePage } from './exercise-page';
import type { Exercise, PlannedExercise } from '@/types';
import type { UnplannedDefaults } from '../types/session-ui';

export function LiveSessionScreen() {
  const router = useRouter();
  const db = useDB();

  const session = useSessionStore((s) => s.session);
  const plannedExercises = useSessionStore((s) => s.plannedExercises);
  const setLogs = useSessionStore((s) => s.setLogs);
  const currentExerciseIndex = useSessionStore((s) => s.currentExerciseIndex);
  const skippedExerciseIds = useSessionStore((s) => s.skippedExerciseIds);
  const setCurrentExercise = useSessionStore((s) => s.setCurrentExercise);
  const skipExercise = useSessionStore((s) => s.skipExercise);
  const addUnplannedExercise = useSessionStore((s) => s.addUnplannedExercise);
  const updateSessionNotes = useSessionStore((s) => s.updateSessionNotes);
  const abandonSession = useSessionStore((s) => s.abandonSession);
  const resetSession = useSessionStore((s) => s.reset);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [configExercise, setConfigExercise] = useState<Exercise | null>(null);
  const [sessionNotesVisible, setSessionNotesVisible] = useState(false);

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

  const handleEndSession = useCallback(() => {
    router.replace('/(app)/session/end' as Parameters<typeof router.replace>[0]);
  }, [router]);

  const handleAbandonSession = useCallback(() => {
    Alert.alert(
      'Abandonner la séance ?',
      'Les sets loggés seront conservés mais la séance sera marquée comme non terminée.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Abandonner',
          style: 'destructive',
          onPress: async () => {
            await abandonSession(db);
            router.replace('/(app)' as Parameters<typeof router.replace>[0]);
            resetSession();
          },
        },
      ]
    );
  }, [abandonSession, db, resetSession, router]);

  const handlePickerSelect = useCallback((exercise: Exercise) => {
    setPickerVisible(false);
    setConfigExercise(exercise);
  }, []);

  const handleConfigConfirm = useCallback(
    (config: UnplannedDefaults) => {
      if (!configExercise || !session) return;
      const insertAfter = currentExerciseIndex + 1;
      const newPe: PlannedExercise = {
        id: generateUUID(),
        workoutDayId: session.workoutDayId ?? `free-${session.id}`,
        exerciseId: configExercise.id,
        exerciseOrder: insertAfter + 1,
        role: 'accessory',
        sets: config.sets,
        repRangeMin: config.repRangeMin,
        repRangeMax: config.repRangeMax,
        targetRir: config.targetRir,
        restSeconds: config.restSeconds,
        tempo: null,
        progressionType: config.progressionType,
        progressionConfig: {},
        notes: null,
        isUnplanned: true,
        createdAt: new Date().toISOString(),
      };
      // Le store appende newPe en fin de tableau, mais on navigue vers insertAfter
      // (currentIndex + 1) : l'intercalation est logique (navigation) pas structurelle
      // (ordre d'insertion). Intentionnel — pas de réordonnancement au MVP.
      addUnplannedExercise(db, newPe);
      setCurrentExercise(insertAfter);
      setConfigExercise(null);
    },
    [configExercise, session, currentExerciseIndex, addUnplannedExercise, db, setCurrentExercise]
  );

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
  const hasSessionNotes =
    (session.preSessionNotes ?? '').length > 0 ||
    (session.postSessionNotes ?? '').length > 0;

  const modals = (
    <SharedSessionModals
      pickerVisible={pickerVisible}
      configExercise={configExercise}
      sessionNotesVisible={sessionNotesVisible}
      preSessionNotes={session.preSessionNotes ?? ''}
      postSessionNotes={session.postSessionNotes ?? ''}
      onPickerSelect={handlePickerSelect}
      onPickerClose={() => setPickerVisible(false)}
      onConfigConfirm={handleConfigConfirm}
      onConfigBack={() => { setConfigExercise(null); setPickerVisible(true); }}
      onConfigClose={() => setConfigExercise(null)}
      onNotesSave={(preNotes, postNotes) => updateSessionNotes(db, preNotes || null, postNotes || null)}
      onNotesClose={() => setSessionNotesVisible(false)}
    />
  );

  if (plannedExercises.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <SessionHeader
          sessionName={sessionName}
          elapsed={elapsed}
          exerciseIndex={0}
          exerciseCount={1}
          hasSessionNotes={hasSessionNotes}
          onAddExercise={() => setPickerVisible(true)}
          onSessionNotes={() => setSessionNotesVisible(true)}
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
        <SessionFooterActions onEnd={handleEndSession} onAbandon={handleAbandonSession} />
        {modals}
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
        hasSessionNotes={hasSessionNotes}
        onAddExercise={() => setPickerVisible(true)}
        onSessionNotes={() => setSessionNotesVisible(true)}
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
      <SessionFooterActions onEnd={handleEndSession} onAbandon={handleAbandonSession} />
      {modals}
    </SafeAreaView>
  );
}
