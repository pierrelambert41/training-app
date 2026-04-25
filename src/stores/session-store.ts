// Contrat crash-safe : SQLite est la source de vérité — chaque mutation est
// persistée immédiatement (writes synchrones côté domaine, fire-and-forget côté
// effet de bord); l'état Zustand est reconstructible via resumeSession().
import { create } from 'zustand';
import { generateUUID } from '@/utils/uuid';
import type { Session, SetLog, PlannedExercise } from '@/types';
import type { SQLiteDatabase } from 'expo-sqlite';
import {
  insertSession,
  updateSession,
  getSessionById,
  getInProgressSessionForToday,
} from '@/services/sessions';
import { insertSetLog, updateSetLog, deleteSetLog, getSetLogsBySessionId } from '@/services/set-logs';
import {
  getPlannedExercisesByWorkoutDayId,
  insertPlannedExercise,
} from '@/services/planned-exercises';
import {
  scheduleRestEndNotification,
  cancelRestNotification,
} from '@/services/rest-notifications';
import { computeSessionScores } from '@/services/session-scores';


export type RestTimer = {
  startedAt: number;
  durationSec: number;
  notificationId: string | null;
  exerciseName: string;
};

interface SessionState {
  session: Session | null;
  plannedExercises: PlannedExercise[];
  setLogs: SetLog[];
  currentExerciseIndex: number;
  skippedExerciseIds: Set<string>;
  restTimer: RestTimer | null;
}

interface SessionActions {
  startSession: (
    db: SQLiteDatabase,
    params: StartSessionParams
  ) => Promise<void>;
  logSet: (db: SQLiteDatabase, params: LogSetParams) => Promise<void>;
  editSet: (db: SQLiteDatabase, setLogId: string, payload: EditSetPayload) => void;
  deleteSet: (db: SQLiteDatabase, setLogId: string) => void;
  setCurrentExercise: (index: number) => void;
  skipExercise: (exerciseId: string) => void;
  addUnplannedExercise: (db: SQLiteDatabase, exercise: PlannedExercise) => void;
  updateSessionNotes: (db: SQLiteDatabase, preSessionNotes: string | null, postSessionNotes: string | null) => void;
  completeSession: (db: SQLiteDatabase) => Promise<void>;
  abandonSession: (db: SQLiteDatabase) => Promise<void>;
  resumeSession: (db: SQLiteDatabase, sessionId: string) => Promise<void>;
  startRestTimer: (durationSec: number, exerciseName: string) => Promise<void>;
  skipRestTimer: () => Promise<void>;
  reset: () => void;
}

export type StartSessionParams = {
  sessionId: string;
  userId: string;
  workoutDayId: string | null;
  blockId: string | null;
  date: string;
  readiness?: number | null;
  energy?: number | null;
  motivation?: number | null;
  sleepQuality?: number | null;
};

export type LogSetParams = {
  plannedExerciseId: string | null;
  exerciseId: string;
  setNumber: number;
  load?: number | null;
  reps?: number | null;
  rir?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  completed?: boolean;
  side?: 'left' | 'right' | null;
  notes?: string | null;
};

export type EditSetPayload = {
  load?: number | null;
  reps?: number | null;
  rir?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  completed?: boolean;
  notes?: string | null;
  side?: 'left' | 'right' | null;
};

const INITIAL_STATE: SessionState = {
  session: null,
  plannedExercises: [],
  setLogs: [],
  currentExerciseIndex: 0,
  skippedExerciseIds: new Set(),
  restTimer: null,
};

export const useSessionStore = create<SessionState & SessionActions>((set, get) => ({
  ...INITIAL_STATE,

  startSession: async (db, params) => {
    const now = new Date().toISOString();
    const newSession: Parameters<typeof insertSession>[1] = {
      id: params.sessionId,
      userId: params.userId,
      workoutDayId: params.workoutDayId,
      blockId: params.blockId,
      date: params.date,
      startedAt: now,
      readiness: params.readiness,
      energy: params.energy,
      motivation: params.motivation,
      sleepQuality: params.sleepQuality,
    };

    let plannedExercises: PlannedExercise[] = [];
    if (params.workoutDayId) {
      try {
        plannedExercises = await getPlannedExercisesByWorkoutDayId(db, params.workoutDayId);
      } catch (e) {
        console.error('[session-store] getPlannedExercisesByWorkoutDayId failed', e);
      }
    }

    let session: Session;
    try {
      session = await insertSession(db, newSession);
    } catch (e) {
      console.error('[session-store] insertSession failed', e);
      return;
    }

    set({
      session,
      plannedExercises,
      setLogs: [],
      currentExerciseIndex: 0,
      skippedExerciseIds: new Set(),
      restTimer: null,
    });
  },

  logSet: async (db, params) => {
    const { session } = get();
    if (!session) return;

    const setLog: SetLog = {
      id: generateUUID(),
      sessionId: session.id,
      exerciseId: params.exerciseId,
      plannedExerciseId: params.plannedExerciseId,
      setNumber: params.setNumber,
      targetLoad: null,
      targetReps: null,
      targetRir: null,
      load: params.load ?? null,
      reps: params.reps ?? null,
      rir: params.rir ?? null,
      durationSeconds: params.durationSeconds ?? null,
      distanceMeters: params.distanceMeters ?? null,
      completed: params.completed ?? true,
      side: params.side ?? null,
      notes: params.notes ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => ({ setLogs: [...state.setLogs, setLog] }));

    insertSetLog(db, {
      id: setLog.id,
      sessionId: setLog.sessionId,
      exerciseId: setLog.exerciseId,
      plannedExerciseId: setLog.plannedExerciseId ?? undefined,
      setNumber: setLog.setNumber,
      load: setLog.load ?? undefined,
      reps: setLog.reps ?? undefined,
      rir: setLog.rir ?? undefined,
      durationSeconds: setLog.durationSeconds ?? undefined,
      distanceMeters: setLog.distanceMeters ?? undefined,
      completed: setLog.completed,
      side: setLog.side ?? undefined,
      notes: setLog.notes ?? undefined,
    }).catch((e) => console.error('[session-store] insertSetLog failed', e));
  },

  editSet: (db, setLogId, payload) => {
    set((state) => ({
      setLogs: state.setLogs.map((sl) =>
        sl.id === setLogId
          ? {
              ...sl,
              ...payload,
              updatedAt: new Date().toISOString(),
            }
          : sl
      ),
    }));

    updateSetLog(db, setLogId, payload).catch((e) =>
      console.error('[session-store] updateSetLog failed', e)
    );
  },

  deleteSet: (db, setLogId) => {
    set((state) => ({
      setLogs: state.setLogs.filter((sl) => sl.id !== setLogId),
    }));

    deleteSetLog(db, setLogId).catch((e) =>
      console.error('[session-store] deleteSetLog failed', e)
    );
  },

  setCurrentExercise: (index) => {
    const { restTimer } = get();
    if (restTimer?.notificationId) {
      cancelRestNotification(restTimer.notificationId);
    }
    set({ currentExerciseIndex: index, restTimer: null });
  },

  skipExercise: (exerciseId) => {
    const { skippedExerciseIds, plannedExercises, currentExerciseIndex } = get();
    const next = new Set(skippedExerciseIds);
    next.add(exerciseId);
    // Math.min keeps the index on the last exercise if we're already there — intentional.
    const nextIndex = Math.min(currentExerciseIndex + 1, plannedExercises.length - 1);
    set({ skippedExerciseIds: next, currentExerciseIndex: nextIndex });
  },

  addUnplannedExercise: (db, exercise) => {
    set((state) => ({
      plannedExercises: [...state.plannedExercises, exercise],
    }));

    insertPlannedExercise(db, {
      id: exercise.id,
      workoutDayId: exercise.workoutDayId,
      exerciseId: exercise.exerciseId,
      exerciseOrder: exercise.exerciseOrder,
      role: exercise.role,
      sets: exercise.sets,
      repRangeMin: exercise.repRangeMin,
      repRangeMax: exercise.repRangeMax,
      targetRir: exercise.targetRir,
      restSeconds: exercise.restSeconds,
      tempo: exercise.tempo,
      progressionType: exercise.progressionType,
      progressionConfig: exercise.progressionConfig,
      notes: exercise.notes,
      isUnplanned: true,
    }).catch((e) =>
      console.error('[session-store] insertPlannedExercise (unplanned) failed', e)
    );
  },

  updateSessionNotes: (db, preSessionNotes, postSessionNotes) => {
    const { session } = get();
    if (!session) return;

    const now = new Date().toISOString();
    const updated: Session = { ...session, preSessionNotes, postSessionNotes, updatedAt: now };
    set({ session: updated });

    updateSession(db, session.id, { preSessionNotes, postSessionNotes }).catch(
      (e) => console.error('[session-store] updateSessionNotes updateSession failed', e)
    );
  },

  completeSession: async (db) => {
    const { session, setLogs, plannedExercises } = get();
    if (!session) return;

    const scores = computeSessionScores(session, setLogs, plannedExercises);
    const now = new Date().toISOString();
    const updated: Session = {
      ...session,
      status: 'completed',
      endedAt: now,
      completionScore: scores.completion_score,
      performanceScore: scores.performance_score,
      fatigueScore: scores.fatigue_score,
      updatedAt: now,
    };
    set({ session: updated });

    updateSession(db, session.id, {
      status: 'completed',
      endedAt: now,
      completionScore: scores.completion_score,
      performanceScore: scores.performance_score,
      fatigueScore: scores.fatigue_score,
    }).catch(
      (e) => console.error('[session-store] completeSession updateSession failed', e)
    );
  },

  abandonSession: async (db) => {
    const { session } = get();
    if (!session) return;

    const now = new Date().toISOString();
    const updated: Session = { ...session, status: 'abandoned', endedAt: now, updatedAt: now };
    set({ session: updated });

    updateSession(db, session.id, { status: 'abandoned', endedAt: now }).catch(
      (e) => console.error('[session-store] abandonSession updateSession failed', e)
    );
  },

  resumeSession: async (db, sessionId) => {
    let session: Session | null;
    try {
      session = await getSessionById(db, sessionId);
    } catch (e) {
      console.error('[session-store] resumeSession getSessionById failed', e);
      return;
    }

    if (!session) return;

    let setLogs: SetLog[] = [];
    try {
      setLogs = await getSetLogsBySessionId(db, sessionId);
    } catch (e) {
      console.error('[session-store] resumeSession getSetLogsBySessionId failed', e);
    }

    let plannedExercises: PlannedExercise[] = [];
    if (session.workoutDayId) {
      try {
        plannedExercises = await getPlannedExercisesByWorkoutDayId(db, session.workoutDayId);
      } catch (e) {
        console.error('[session-store] resumeSession getPlannedExercisesByWorkoutDayId failed', e);
      }
    }

    set({
      session,
      setLogs,
      plannedExercises,
      currentExerciseIndex: 0,
      skippedExerciseIds: new Set(),
      restTimer: null,
    });
  },

  startRestTimer: async (durationSec, exerciseName) => {
    const { restTimer } = get();
    if (restTimer?.notificationId) {
      await cancelRestNotification(restTimer.notificationId);
    }

    const notificationId = await scheduleRestEndNotification(durationSec, exerciseName);

    set({
      restTimer: {
        startedAt: Date.now(),
        durationSec,
        notificationId,
        exerciseName,
      },
    });
  },

  skipRestTimer: async () => {
    const { restTimer } = get();
    if (!restTimer) return;

    if (restTimer.notificationId) {
      await cancelRestNotification(restTimer.notificationId);
    }

    set({ restTimer: null });
  },

  reset: () => set(INITIAL_STATE),
}));

export async function lookupInProgressSessionForToday(
  db: SQLiteDatabase,
  userId: string
): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const session = await getInProgressSessionForToday(db, userId, today);
    return session?.id ?? null;
  } catch (e) {
    console.error('[session-store] lookupInProgressSessionForToday failed', e);
    return null;
  }
}
