/**
 * TA-84 — Tests d'intégration : abandon explicite + reprise auto + offline.
 *
 * Le logger offline-first doit fonctionner de bout en bout sans dépendre du
 * réseau. Cette suite valide cinq scénarios critiques :
 *  1. start → log 3 sets → reset store → resume → state identique
 *  2. start → log 2 sets → abandon → status='abandoned' + sets persistés
 *  3. start → log tous les sets → completeSession → scores + status='completed'
 *  4. tout offline (fetch unreachable) → resume → tout fonctionne
 *  5. 2 sessions différentes pour 2 WorkoutDays → pas de collision au lookup
 *
 * Stratégie :
 *  - Mock SQLite éphémère in-memory (pattern réutilisé de session-phase4-integration).
 *  - Vrais services sessions / set_logs / device-id / sync_queue (cœur logger).
 *  - Seul service mocké : getPlannedExercisesByWorkoutDayId (lookup tangentiel
 *    pour la réhydratation), sinon il faudrait répliquer la DDL planned_exercises.
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import type { PlannedExercise, SetLog } from '@/types';

// --- Mocks (déclarés AVANT l'import du store pour que jest.mock soit hoisté) ---

jest.mock('@/services/planned-exercises', () => ({
  getPlannedExercisesByWorkoutDayId: jest.fn(),
  insertPlannedExercise: jest.fn(),
}));

jest.mock('@/services/rest-notifications', () => ({
  scheduleRestEndNotification: jest.fn(() => Promise.resolve(null)),
  cancelRestNotification: jest.fn(() => Promise.resolve()),
}));

let uuidCounter = 0;
const mockRandomUUID = jest.fn(() => `uuid-${++uuidCounter}`);

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: mockRandomUUID,
      // RN polyfill : insertSession passe par getOrCreateDeviceId qui appelle
      // crypto.getRandomValues. On fournit une impl déterministe.
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = (i * 7) & 0xff;
        return arr;
      },
    },
    writable: true,
    configurable: true,
  });
});

import {
  useSessionStore,
  lookupInProgressSessionForToday,
} from '@/stores/session-store';
import {
  getInProgressSessionForToday,
  getInProgressSessionForWorkoutDay,
} from '@/services/sessions';
import { getPlannedExercisesByWorkoutDayId } from '@/services/planned-exercises';

const mockGetPlannedExercises = getPlannedExercisesByWorkoutDayId as jest.Mock;

// ---------------------------------------------------------------------------
// In-memory SQLite mock — couvre les requêtes utilisées par le store + services
// `sessions`, `set_logs`, `device-id`, `sync_queue`.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
type Store = {
  app_meta: Row[];
  sessions: Row[];
  set_logs: Row[];
  sync_queue: Row[];
};

function makeInMemoryDb(): SQLiteDatabase & { __store: Store } {
  const store: Store = {
    app_meta: [],
    sessions: [],
    set_logs: [],
    sync_queue: [],
  };

  const runAsync = jest.fn(async (sql: string, params: unknown[] = []) => {
    const trimmed = sql.trim();

    if (trimmed.startsWith('INSERT OR IGNORE INTO app_meta')) {
      const exists = store.app_meta.find((r) => r.key === params[0]);
      if (!exists) {
        store.app_meta.push({ key: params[0], value: params[1] });
      }
    } else if (trimmed.startsWith('INSERT INTO sessions')) {
      store.sessions.push({
        id: params[0],
        user_id: params[1],
        workout_day_id: params[2],
        block_id: params[3],
        date: params[4],
        started_at: params[5],
        ended_at: params[6],
        status: params[7],
        readiness: params[8],
        energy: params[9],
        motivation: params[10],
        sleep_quality: params[11],
        pre_session_notes: params[12],
        completion_score: params[13],
        performance_score: params[14],
        fatigue_score: params[15],
        post_session_notes: params[16],
        device_id: params[17],
        synced_at: params[18],
        created_at: params[19],
        updated_at: params[20],
      });
    } else if (trimmed.startsWith('UPDATE sessions')) {
      const id = params[params.length - 1] as string;
      const idx = store.sessions.findIndex((r) => r.id === id);
      if (idx >= 0) {
        store.sessions[idx] = {
          ...store.sessions[idx],
          workout_day_id: params[0],
          block_id: params[1],
          date: params[2],
          started_at: params[3],
          ended_at: params[4],
          status: params[5],
          readiness: params[6],
          energy: params[7],
          motivation: params[8],
          sleep_quality: params[9],
          pre_session_notes: params[10],
          completion_score: params[11],
          performance_score: params[12],
          fatigue_score: params[13],
          post_session_notes: params[14],
          updated_at: params[15],
        };
      }
    } else if (trimmed.startsWith('INSERT INTO set_logs')) {
      store.set_logs.push({
        id: params[0],
        session_id: params[1],
        exercise_id: params[2],
        planned_exercise_id: params[3],
        set_number: params[4],
        target_load: params[5],
        target_reps: params[6],
        target_rir: params[7],
        load: params[8],
        reps: params[9],
        rir: params[10],
        duration_seconds: params[11],
        distance_meters: params[12],
        completed: params[13],
        side: params[14],
        notes: params[15],
        created_at: params[16],
        updated_at: params[17],
      });
    } else if (trimmed.startsWith('UPDATE set_logs')) {
      const id = params[params.length - 1] as string;
      const idx = store.set_logs.findIndex((r) => r.id === id);
      if (idx >= 0) {
        store.set_logs[idx] = {
          ...store.set_logs[idx],
          set_number: params[0],
          target_load: params[1],
          target_reps: params[2],
          target_rir: params[3],
          load: params[4],
          reps: params[5],
          rir: params[6],
          duration_seconds: params[7],
          distance_meters: params[8],
          completed: params[9],
          side: params[10],
          notes: params[11],
          updated_at: params[12],
        };
      }
    } else if (trimmed.startsWith('DELETE FROM set_logs')) {
      const id = params[0] as string;
      store.set_logs = store.set_logs.filter((r) => r.id !== id);
    } else if (trimmed.startsWith('INSERT INTO sync_queue')) {
      store.sync_queue.push({
        id: store.sync_queue.length + 1,
        table_name: params[0],
        record_id: params[1],
        action: params[2],
        payload: params[3],
        created_at: params[4],
        synced: 0,
      });
    }

    return { lastInsertRowId: 1, changes: 1 };
  });

  const getFirstAsync = jest.fn(
    async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
      const trimmed = sql.trim();

      if (trimmed.includes('FROM app_meta')) {
        const key = params[0] as string;
        const row = store.app_meta.find((r) => r.key === key);
        return ((row ? { value: row.value } : null) as T | null);
      }
      if (
        trimmed.includes('FROM sessions') &&
        trimmed.includes('user_id = ?') &&
        trimmed.includes('date = ?') &&
        trimmed.includes("status = 'in_progress'")
      ) {
        const userId = params[0] as string;
        const date = params[1] as string;
        const matches = store.sessions
          .filter(
            (r) =>
              r.user_id === userId &&
              r.date === date &&
              r.status === 'in_progress'
          )
          .sort((a, b) =>
            (b.created_at as string).localeCompare(a.created_at as string)
          );
        return ((matches[0] as T) ?? null);
      }
      if (
        trimmed.includes('FROM sessions') &&
        trimmed.includes('workout_day_id = ?') &&
        trimmed.includes("status = 'in_progress'")
      ) {
        const workoutDayId = params[0] as string;
        const matches = store.sessions
          .filter(
            (r) =>
              r.workout_day_id === workoutDayId && r.status === 'in_progress'
          )
          .sort((a, b) =>
            (b.created_at as string).localeCompare(a.created_at as string)
          );
        return ((matches[0] as T) ?? null);
      }
      if (trimmed.includes('FROM sessions WHERE id')) {
        const id = params[0] as string;
        return ((store.sessions.find((r) => r.id === id) as T) ?? null);
      }
      if (trimmed.includes('FROM set_logs WHERE id')) {
        const id = params[0] as string;
        return ((store.set_logs.find((r) => r.id === id) as T) ?? null);
      }
      return null;
    }
  );

  const getAllAsync = jest.fn(
    async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
      const trimmed = sql.trim();

      if (trimmed.startsWith('SELECT id FROM set_logs WHERE session_id')) {
        const sessionId = params[0] as string;
        return store.set_logs
          .filter((r) => r.session_id === sessionId)
          .map((r) => ({ id: r.id })) as T[];
      }
      if (
        trimmed.includes('FROM set_logs') &&
        trimmed.includes('session_id = ?')
      ) {
        const sessionId = params[0] as string;
        return store.set_logs
          .filter((r) => r.session_id === sessionId)
          .sort((a, b) => {
            const exDiff = (a.exercise_id as string).localeCompare(
              b.exercise_id as string
            );
            if (exDiff !== 0) return exDiff;
            return (a.set_number as number) - (b.set_number as number);
          }) as T[];
      }
      return [];
    }
  );

  return {
    runAsync,
    getFirstAsync,
    getAllAsync,
    execAsync: jest.fn(async () => {}),
    __store: store,
  } as unknown as SQLiteDatabase & { __store: Store };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    isUnplanned: false,
    createdAt: '2026-04-25T00:00:00.000Z',
    ...overrides,
  };
}

function resetStore() {
  // Le reset() built-in remet aussi les actions ; on le lance via getState
  // pour passer à travers la machinerie Zustand normale.
  useSessionStore.getState().reset();
}

beforeEach(() => {
  uuidCounter = 0;
  mockRandomUUID.mockClear();
  mockGetPlannedExercises.mockReset();
  resetStore();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TA-84 — Abandon, reprise, offline (intégration logger)', () => {
  it('1. start → log 3 sets → reset store → resume → state identique', async () => {
    const db = makeInMemoryDb();
    const planned = [makePlannedExercise()];
    mockGetPlannedExercises.mockResolvedValue(planned);

    const sessionId = 'sess-1';
    await useSessionStore.getState().startSession(db, {
      sessionId,
      userId: 'user-1',
      workoutDayId: 'wd-1',
      blockId: 'block-1',
      date: '2026-04-25',
      readiness: 8,
    });

    await useSessionStore.getState().logSet(db, {
      plannedExerciseId: 'pe-1',
      exerciseId: 'ex-bench',
      setNumber: 1,
      load: 100,
      reps: 8,
      rir: 2,
    });
    await useSessionStore.getState().logSet(db, {
      plannedExerciseId: 'pe-1',
      exerciseId: 'ex-bench',
      setNumber: 2,
      load: 100,
      reps: 7,
      rir: 1,
    });
    await useSessionStore.getState().logSet(db, {
      plannedExerciseId: 'pe-1',
      exerciseId: 'ex-bench',
      setNumber: 3,
      load: 100,
      reps: 6,
      rir: 0,
    });

    const before = useSessionStore.getState();
    expect(before.session?.id).toBe(sessionId);
    expect(before.setLogs).toHaveLength(3);
    expect(before.plannedExercises).toEqual(planned);
    const beforeIds = before.setLogs.map((s) => s.id).sort();
    const beforeReps = before.setLogs.map((s) => s.reps);
    const beforeLoads = before.setLogs.map((s) => s.load);

    // Simule la fermeture/reopen de l'app : Zustand est un singleton mais
    // l'état est volatile — la persistance vit en SQLite, c'est tout l'enjeu.
    resetStore();
    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().setLogs).toEqual([]);

    await useSessionStore.getState().resumeSession(db, sessionId);

    const after = useSessionStore.getState();
    expect(after.session?.id).toBe(sessionId);
    expect(after.session?.status).toBe('in_progress');
    expect(after.session?.workoutDayId).toBe('wd-1');
    expect(after.setLogs).toHaveLength(3);
    expect(after.setLogs.map((s) => s.id).sort()).toEqual(beforeIds);
    // Tri SQLite : exercise_id ASC, set_number ASC.
    expect(after.setLogs.map((s) => s.setNumber)).toEqual([1, 2, 3]);
    expect(after.setLogs.map((s) => s.reps)).toEqual(beforeReps);
    expect(after.setLogs.map((s) => s.load)).toEqual(beforeLoads);
    expect(after.plannedExercises).toEqual(planned);
    // Le state UI revient à zéro — comportement attendu : reprise = boot propre.
    expect(after.currentExerciseIndex).toBe(0);
  });

  it('2. start → log 2 sets → abandon → status="abandoned" + sets persistés', async () => {
    const db = makeInMemoryDb();
    mockGetPlannedExercises.mockResolvedValue([makePlannedExercise()]);

    await useSessionStore.getState().startSession(db, {
      sessionId: 'sess-2',
      userId: 'user-1',
      workoutDayId: 'wd-1',
      blockId: null,
      date: '2026-04-25',
    });

    await useSessionStore.getState().logSet(db, {
      plannedExerciseId: 'pe-1',
      exerciseId: 'ex-bench',
      setNumber: 1,
      load: 80,
      reps: 8,
    });
    await useSessionStore.getState().logSet(db, {
      plannedExerciseId: 'pe-1',
      exerciseId: 'ex-bench',
      setNumber: 2,
      load: 80,
      reps: 6,
    });

    await useSessionStore.getState().abandonSession(db);

    // Laisse les writes fire-and-forget se résoudre (updateSession est await
    // dans le store mais .catch en queue — on flush la microtask).
    await Promise.resolve();
    await Promise.resolve();

    const state = useSessionStore.getState();
    expect(state.session?.status).toBe('abandoned');
    expect(state.session?.endedAt).not.toBeNull();

    // Persistance SQLite : status='abandoned', sets toujours là.
    expect(db.__store.sessions[0].status).toBe('abandoned');
    expect(db.__store.sessions[0].ended_at).not.toBeNull();
    expect(db.__store.set_logs).toHaveLength(2);

    // La session n'apparaît plus dans le lookup "in_progress aujourd'hui".
    // (On appelle directement le service avec la date fixée pour rester
    // déterministe — `aujourd'hui` est dynamique côté store.)
    const lookup = await getInProgressSessionForToday(db, 'user-1', '2026-04-25');
    expect(lookup).toBeNull();

    // Smoke check : le helper du store existe (la date courante peut diverger
    // de '2026-04-25' selon l'environnement — on vérifie juste l'export).
    expect(typeof lookupInProgressSessionForToday).toBe('function');
  });

  it('3. start → log tous les sets → completeSession → scores + status="completed"', async () => {
    const db = makeInMemoryDb();
    const planned = [makePlannedExercise({ sets: 3 })];
    mockGetPlannedExercises.mockResolvedValue(planned);

    await useSessionStore.getState().startSession(db, {
      sessionId: 'sess-3',
      userId: 'user-1',
      workoutDayId: 'wd-1',
      blockId: null,
      date: '2026-04-25',
      readiness: 8,
      energy: 8,
      motivation: 8,
      sleepQuality: 8,
    });

    for (let i = 1; i <= 3; i += 1) {
      await useSessionStore.getState().logSet(db, {
        plannedExerciseId: 'pe-1',
        exerciseId: 'ex-bench',
        setNumber: i,
        load: 100,
        reps: 8,
        rir: 2,
        completed: true,
      });
    }

    await useSessionStore.getState().completeSession(db);
    await Promise.resolve();
    await Promise.resolve();

    const state = useSessionStore.getState();
    expect(state.session?.status).toBe('completed');
    expect(state.session?.endedAt).not.toBeNull();

    // Les scores sont calculés et matérialisés.
    expect(state.session?.completionScore).not.toBeNull();
    expect(state.session?.performanceScore).not.toBeNull();
    expect(state.session?.fatigueScore).not.toBeNull();
    // completion_score est un ratio [0, 1] : tous les sets validés → 1.
    expect(state.session?.completionScore).toBeCloseTo(1, 5);
    // performance_score est sur [0, 10].
    expect(state.session?.performanceScore).toBeGreaterThan(0);
    expect(state.session?.performanceScore).toBeLessThanOrEqual(10);

    // Persistance SQLite alignée.
    expect(db.__store.sessions[0].status).toBe('completed');
    expect(db.__store.sessions[0].completion_score).toBeCloseTo(1, 5);
  });

  it("4. mode offline (fetch unreachable) → log → reset → resume → tout fonctionne sans réseau", async () => {
    // Simule un appareil sans connectivité : tout appel fetch throw.
    const originalFetch = globalThis.fetch;
    const fetchSpy = jest
      .fn()
      .mockRejectedValue(new Error('Network request failed'));
    (globalThis as unknown as { fetch: typeof fetch }).fetch =
      fetchSpy as unknown as typeof fetch;

    try {
      const db = makeInMemoryDb();
      mockGetPlannedExercises.mockResolvedValue([makePlannedExercise({ sets: 2 })]);

      await useSessionStore.getState().startSession(db, {
        sessionId: 'sess-offline',
        userId: 'user-1',
        workoutDayId: 'wd-1',
        blockId: null,
        date: '2026-04-25',
      });

      await useSessionStore.getState().logSet(db, {
        plannedExerciseId: 'pe-1',
        exerciseId: 'ex-bench',
        setNumber: 1,
        load: 90,
        reps: 8,
      });
      await useSessionStore.getState().logSet(db, {
        plannedExerciseId: 'pe-1',
        exerciseId: 'ex-bench',
        setNumber: 2,
        load: 90,
        reps: 7,
      });

      // Reset (simule fermeture du process JS, l'état Zustand est volatile).
      resetStore();
      expect(useSessionStore.getState().session).toBeNull();

      // Resume : SQLite est la source de vérité, doit suffire.
      await useSessionStore.getState().resumeSession(db, 'sess-offline');

      const state = useSessionStore.getState();
      expect(state.session?.id).toBe('sess-offline');
      expect(state.setLogs).toHaveLength(2);
      expect(state.setLogs.map((s) => s.load)).toEqual([90, 90]);
      expect(state.setLogs.map((s) => s.reps)).toEqual([8, 7]);

      // Aucun appel réseau effectué pendant tout le flow.
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      (globalThis as unknown as { fetch: typeof fetch }).fetch = originalFetch;
    }
  });

  it('5. 2 sessions différentes pour 2 WorkoutDays différents → pas de collision', async () => {
    const db = makeInMemoryDb();
    const plannedA = [makePlannedExercise({ id: 'pe-a', workoutDayId: 'wd-a' })];
    const plannedB = [
      makePlannedExercise({
        id: 'pe-b',
        workoutDayId: 'wd-b',
        exerciseId: 'ex-squat',
      }),
    ];

    // 1ère session sur wd-a
    mockGetPlannedExercises.mockResolvedValueOnce(plannedA);
    await useSessionStore.getState().startSession(db, {
      sessionId: 'sess-a',
      userId: 'user-1',
      workoutDayId: 'wd-a',
      blockId: null,
      date: '2026-04-25',
    });
    await useSessionStore.getState().logSet(db, {
      plannedExerciseId: 'pe-a',
      exerciseId: 'ex-bench',
      setNumber: 1,
      load: 100,
      reps: 8,
    });

    // Petite sleep pour assurer que created_at diffère (timestamps distincts)
    await new Promise(r => setTimeout(r, 1));


    // On simule un changement de WorkoutDay sans abandon de la première :
    // l'utilisateur démarre une 2e session pour un autre WorkoutDay.
    // (Cas pathologique, mais on veut vérifier la non-collision côté lookup.)
    mockGetPlannedExercises.mockResolvedValueOnce(plannedB);
    await useSessionStore.getState().startSession(db, {
      sessionId: 'sess-b',
      userId: 'user-1',
      workoutDayId: 'wd-b',
      blockId: null,
      date: '2026-04-25',
    });
    await useSessionStore.getState().logSet(db, {
      plannedExerciseId: 'pe-b',
      exerciseId: 'ex-squat',
      setNumber: 1,
      load: 120,
      reps: 6,
    });

    // En SQLite, les deux sessions coexistent.
    expect(db.__store.sessions).toHaveLength(2);
    expect(db.__store.set_logs).toHaveLength(2);

    // Lookup par WorkoutDay : retourne la BONNE session, pas l'autre.
    const aLookup = await getInProgressSessionForWorkoutDay(db, 'wd-a');
    expect(aLookup?.id).toBe('sess-a');
    const bLookup = await getInProgressSessionForWorkoutDay(db, 'wd-b');
    expect(bLookup?.id).toBe('sess-b');

    // Lookup par utilisateur+date : retourne la plus récente (sess-b),
    // c'est le contrat documenté dans getInProgressSessionForToday.
    const todayLookup = await getInProgressSessionForToday(
      db,
      'user-1',
      '2026-04-25'
    );
    expect(todayLookup?.id).toBe('sess-b');

    // Reprise explicite de la session A : récupère ses propres set_logs,
    // pas ceux de B (vérifie l'isolation par session_id).
    resetStore();
    // resumeSession lit aussi getPlannedExercisesByWorkoutDayId(wd-a).
    mockGetPlannedExercises.mockResolvedValueOnce(plannedA);
    await useSessionStore.getState().resumeSession(db, 'sess-a');

    const resumed = useSessionStore.getState();
    expect(resumed.session?.id).toBe('sess-a');
    expect(resumed.session?.workoutDayId).toBe('wd-a');
    expect(resumed.setLogs).toHaveLength(1);
    const onlySet = resumed.setLogs[0] as SetLog;
    expect(onlySet.exerciseId).toBe('ex-bench');
    expect(onlySet.load).toBe(100);
  });
});
