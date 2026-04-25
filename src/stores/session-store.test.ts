import { useSessionStore } from './session-store';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Session, SetLog, PlannedExercise } from '@/types';

let uuidCounter = 0;
const mockRandomUUID = jest.fn(() => `uuid-set-${++uuidCounter}`);

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: mockRandomUUID },
    writable: true,
    configurable: true,
  });
});

jest.mock('@/services/sessions', () => ({
  insertSession: jest.fn(),
  updateSession: jest.fn(),
  getSessionById: jest.fn(),
  getInProgressSessionForToday: jest.fn(),
}));

jest.mock('@/services/set-logs', () => ({
  insertSetLog: jest.fn(),
  updateSetLog: jest.fn(),
  deleteSetLog: jest.fn(),
  getSetLogsBySessionId: jest.fn(),
}));

jest.mock('@/services/planned-exercises', () => ({
  getPlannedExercisesByWorkoutDayId: jest.fn(),
}));

import {
  insertSession,
  updateSession,
  getSessionById,
} from '@/services/sessions';
import {
  insertSetLog,
  updateSetLog,
  deleteSetLog,
  getSetLogsBySessionId,
} from '@/services/set-logs';
import { getPlannedExercisesByWorkoutDayId } from '@/services/planned-exercises';

const mockInsertSession = insertSession as jest.Mock;
const mockUpdateSession = updateSession as jest.Mock;
const mockGetSessionById = getSessionById as jest.Mock;
const mockInsertSetLog = insertSetLog as jest.Mock;
const mockUpdateSetLog = updateSetLog as jest.Mock;
const mockDeleteSetLog = deleteSetLog as jest.Mock;
const mockGetSetLogsBySessionId = getSetLogsBySessionId as jest.Mock;
const mockGetPlannedExercises = getPlannedExercisesByWorkoutDayId as jest.Mock;

const mockDb = {} as SQLiteDatabase;

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 'sess-1',
    userId: 'user-1',
    workoutDayId: 'wd-1',
    blockId: 'block-1',
    date: '2026-04-25',
    startedAt: '2026-04-25T10:00:00.000Z',
    endedAt: null,
    status: 'in_progress',
    readiness: 8,
    energy: null,
    motivation: null,
    sleepQuality: null,
    preSessionNotes: null,
    completionScore: null,
    performanceScore: null,
    fatigueScore: null,
    postSessionNotes: null,
    deviceId: 'device-1',
    syncedAt: null,
    createdAt: '2026-04-25T10:00:00.000Z',
    updatedAt: '2026-04-25T10:00:00.000Z',
    ...overrides,
  };
}

function makePlannedExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    id: 'pe-1',
    workoutDayId: 'wd-1',
    exerciseId: 'ex-bench',
    exerciseOrder: 1,
    role: 'main',
    sets: 3,
    repRangeMin: 6,
    repRangeMax: 8,
    targetRir: 2,
    restSeconds: 180,
    tempo: null,
    progressionType: 'strength_fixed',
    progressionConfig: {
      increment_upper_kg: 2.5,
      increment_lower_kg: 5,
      rir_threshold_increase: 0,
      failures_before_reset: 2,
      reset_delta_kg: 5,
    },
    notes: null,
    createdAt: '2026-04-25T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  uuidCounter = 0;
  mockRandomUUID.mockClear();
  useSessionStore.setState({
    session: null,
    plannedExercises: [],
    setLogs: [],
    currentExerciseIndex: 0,
    restTimer: null,
  });
  jest.clearAllMocks();
  mockRandomUUID.mockImplementation(() => `uuid-set-${++uuidCounter}`);
});

describe('useSessionStore', () => {
  describe('startSession', () => {
    it('inserts session in SQLite and populates state', async () => {
      const session = makeSession();
      const planned = [makePlannedExercise()];
      mockInsertSession.mockResolvedValue(session);
      mockGetPlannedExercises.mockResolvedValue(planned);

      await useSessionStore.getState().startSession(mockDb, {
        sessionId: 'sess-1',
        userId: 'user-1',
        workoutDayId: 'wd-1',
        blockId: 'block-1',
        date: '2026-04-25',
        readiness: 8,
      });

      const state = useSessionStore.getState();
      expect(state.session).toEqual(session);
      expect(state.plannedExercises).toEqual(planned);
      expect(state.setLogs).toEqual([]);
      expect(state.currentExerciseIndex).toBe(0);
      expect(mockInsertSession).toHaveBeenCalledTimes(1);
      expect(mockGetPlannedExercises).toHaveBeenCalledWith(mockDb, 'wd-1');
    });

    it('starts with no planned exercises when workoutDayId is null', async () => {
      const session = makeSession({ workoutDayId: null });
      mockInsertSession.mockResolvedValue(session);

      await useSessionStore.getState().startSession(mockDb, {
        sessionId: 'sess-1',
        userId: 'user-1',
        workoutDayId: null,
        blockId: null,
        date: '2026-04-25',
      });

      expect(mockGetPlannedExercises).not.toHaveBeenCalled();
      expect(useSessionStore.getState().plannedExercises).toEqual([]);
    });
  });

  describe('logSet → editSet → complete scenario', () => {
    it('start → log 3 sets → edit 1 → complete produces correct state and SQLite calls', async () => {
      const session = makeSession();
      mockInsertSession.mockResolvedValue(session);
      mockGetPlannedExercises.mockResolvedValue([makePlannedExercise()]);
      mockInsertSetLog.mockResolvedValue(undefined);
      mockUpdateSetLog.mockResolvedValue(undefined);
      mockUpdateSession.mockResolvedValue({ ...session, status: 'completed' });

      await useSessionStore.getState().startSession(mockDb, {
        sessionId: 'sess-1',
        userId: 'user-1',
        workoutDayId: 'wd-1',
        blockId: 'block-1',
        date: '2026-04-25',
        readiness: 8,
      });

      await useSessionStore.getState().logSet(mockDb, {
        plannedExerciseId: 'pe-1',
        exerciseId: 'ex-bench',
        setNumber: 1,
        load: 100,
        reps: 8,
        rir: 2,
      });

      await useSessionStore.getState().logSet(mockDb, {
        plannedExerciseId: 'pe-1',
        exerciseId: 'ex-bench',
        setNumber: 2,
        load: 100,
        reps: 7,
        rir: 1,
      });

      await useSessionStore.getState().logSet(mockDb, {
        plannedExerciseId: 'pe-1',
        exerciseId: 'ex-bench',
        setNumber: 3,
        load: 100,
        reps: 6,
        rir: 0,
        completed: false,
      });

      const afterLogs = useSessionStore.getState().setLogs;
      expect(afterLogs).toHaveLength(3);
      expect(afterLogs[0].id).toBe('uuid-set-1');
      expect(afterLogs[0].load).toBe(100);
      expect(afterLogs[0].reps).toBe(8);
      expect(afterLogs[1].id).toBe('uuid-set-2');
      expect(afterLogs[2].completed).toBe(false);

      await useSessionStore.getState().editSet(mockDb, 'uuid-set-2', { reps: 8 });

      const afterEdit = useSessionStore.getState().setLogs;
      const editedSet = afterEdit.find((s) => s.id === 'uuid-set-2');
      expect(editedSet?.reps).toBe(8);

      await useSessionStore.getState().completeSession(mockDb);

      const finalState = useSessionStore.getState();
      expect(finalState.session?.status).toBe('completed');
      expect(finalState.session?.endedAt).not.toBeNull();

      expect(mockInsertSetLog).toHaveBeenCalledTimes(3);
      expect(mockUpdateSetLog).toHaveBeenCalledWith(mockDb, 'uuid-set-2', { reps: 8 });
      expect(mockUpdateSession).toHaveBeenCalledWith(
        mockDb,
        'sess-1',
        expect.objectContaining({ status: 'completed' })
      );
    });
  });

  describe('deleteSet', () => {
    it('removes set from state and calls deleteSetLog', async () => {
      const session = makeSession();
      mockInsertSession.mockResolvedValue(session);
      mockGetPlannedExercises.mockResolvedValue([]);
      mockInsertSetLog.mockResolvedValue(undefined);
      mockDeleteSetLog.mockResolvedValue(undefined);

      await useSessionStore.getState().startSession(mockDb, {
        sessionId: 'sess-1',
        userId: 'user-1',
        workoutDayId: null,
        blockId: null,
        date: '2026-04-25',
      });

      await useSessionStore.getState().logSet(mockDb, {
        plannedExerciseId: null,
        exerciseId: 'ex-squat',
        setNumber: 1,
        load: 80,
        reps: 5,
      });

      const setId = useSessionStore.getState().setLogs[0].id;
      await useSessionStore.getState().deleteSet(mockDb, setId);

      expect(useSessionStore.getState().setLogs).toHaveLength(0);
      expect(mockDeleteSetLog).toHaveBeenCalledWith(mockDb, setId);
    });
  });

  describe('setCurrentExercise', () => {
    it('updates currentExerciseIndex', () => {
      useSessionStore.getState().setCurrentExercise(2);
      expect(useSessionStore.getState().currentExerciseIndex).toBe(2);
    });
  });

  describe('addUnplannedExercise', () => {
    it('appends a virtual planned exercise in-memory without SQLite call', () => {
      const unplanned = makePlannedExercise({ id: 'pe-unplanned' });
      useSessionStore.getState().addUnplannedExercise(unplanned);
      expect(useSessionStore.getState().plannedExercises).toContain(unplanned);
      expect(mockInsertSetLog).not.toHaveBeenCalled();
    });
  });

  describe('abandonSession', () => {
    it('sets status to abandoned and calls updateSession', async () => {
      const session = makeSession();
      useSessionStore.setState({ session });
      mockUpdateSession.mockResolvedValue({ ...session, status: 'abandoned' });

      await useSessionStore.getState().abandonSession(mockDb);

      expect(useSessionStore.getState().session?.status).toBe('abandoned');
      expect(mockUpdateSession).toHaveBeenCalledWith(
        mockDb,
        'sess-1',
        expect.objectContaining({ status: 'abandoned' })
      );
    });
  });

  describe('resumeSession', () => {
    it('reloads session + setLogs + plannedExercises from SQLite', async () => {
      const session = makeSession();
      const setLogs: SetLog[] = [
        {
          id: 'sl-1',
          sessionId: 'sess-1',
          exerciseId: 'ex-bench',
          plannedExerciseId: 'pe-1',
          setNumber: 1,
          targetLoad: null,
          targetReps: null,
          targetRir: null,
          load: 100,
          reps: 8,
          rir: 2,
          durationSeconds: null,
          distanceMeters: null,
          completed: true,
          side: null,
          notes: null,
          createdAt: '2026-04-25T10:00:00.000Z',
          updatedAt: '2026-04-25T10:00:00.000Z',
        },
      ];
      const planned = [makePlannedExercise()];

      mockGetSessionById.mockResolvedValue(session);
      mockGetSetLogsBySessionId.mockResolvedValue(setLogs);
      mockGetPlannedExercises.mockResolvedValue(planned);

      await useSessionStore.getState().resumeSession(mockDb, 'sess-1');

      const state = useSessionStore.getState();
      expect(state.session).toEqual(session);
      expect(state.setLogs).toEqual(setLogs);
      expect(state.plannedExercises).toEqual(planned);
      expect(state.currentExerciseIndex).toBe(0);
    });

    it('does nothing if session not found', async () => {
      mockGetSessionById.mockResolvedValue(null);

      await useSessionStore.getState().resumeSession(mockDb, 'nonexistent');

      expect(useSessionStore.getState().session).toBeNull();
    });
  });

  describe('reset', () => {
    it('clears all session state', () => {
      useSessionStore.setState({
        session: makeSession(),
        setLogs: [],
        currentExerciseIndex: 3,
      });

      useSessionStore.getState().reset();

      const state = useSessionStore.getState();
      expect(state.session).toBeNull();
      expect(state.setLogs).toEqual([]);
      expect(state.currentExerciseIndex).toBe(0);
    });
  });

  describe('fire-and-forget error handling', () => {
    it('does not throw when SQLite insertSetLog fails', async () => {
      const session = makeSession();
      mockInsertSession.mockResolvedValue(session);
      mockGetPlannedExercises.mockResolvedValue([]);
      mockInsertSetLog.mockRejectedValue(new Error('DB error'));

      await useSessionStore.getState().startSession(mockDb, {
        sessionId: 'sess-1',
        userId: 'user-1',
        workoutDayId: null,
        blockId: null,
        date: '2026-04-25',
      });

      await expect(
        useSessionStore.getState().logSet(mockDb, {
          plannedExerciseId: null,
          exerciseId: 'ex-squat',
          setNumber: 1,
        })
      ).resolves.not.toThrow();

      expect(useSessionStore.getState().setLogs).toHaveLength(1);
    });
  });
});
