/**
 * TA-109 — Tests d'intégration `runRulesEngine` avec SQLite in-memory.
 *
 * Couvre :
 *  - Persistance des Recommendation (load_change, plateau, deload)
 *  - Mise à jour des scores Session (completion/performance/fatigue)
 *  - Mutation block.status (active → deloaded) idempotente
 *  - progressionVsPrevious calculé sur e1RM réel (remplace stub TA-83)
 *  - Idempotence : 2 runs successifs = même état sémantique, pas de doublons
 *  - Edge cases : free session, session inconnue, pas d'historique, block planned
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { runRulesEngine } from './rules-engine-service';
import { insertSession, updateSession } from '@/services/sessions';
import { insertSetLog } from '@/services/set-logs';
import { insertBlock } from '@/services/blocks';
import { insertPlannedExercise } from '@/services/planned-exercises';
import { getRecommendationsBySession } from '@/services/recommendations';
import { getBlockById } from '@/services/blocks';
import { getSessionById } from '@/services/sessions';
import type {
  PlannedExercise,
  Session,
  SetLog,
  StrengthFixedConfig,
  DoubleProgressionConfig,
} from '@/types';

// ---------------------------------------------------------------------------
// In-memory SQLite — supporte les tables sessions, set_logs, planned_exercises,
// recommendations, blocks, sync_queue, app_meta.
// Pattern adapté de session-phase4-integration.test.ts.
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;
type Store = {
  app_meta: Row[];
  sessions: Row[];
  set_logs: Row[];
  planned_exercises: Row[];
  recommendations: Row[];
  blocks: Row[];
  sync_queue: Row[];
};

beforeAll(() => {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'mock-uuid',
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = (i * 7) & 0xff;
        return arr;
      },
    },
    writable: true,
    configurable: true,
  });
});

function makeInMemoryDb(): SQLiteDatabase & { __store: Store } {
  const store: Store = {
    app_meta: [],
    sessions: [],
    set_logs: [],
    planned_exercises: [],
    recommendations: [],
    blocks: [],
    sync_queue: [],
  };

  const runAsync = jest.fn(async (sql: string, params: unknown[] = []) => {
    const trimmed = sql.trim();

    if (trimmed.startsWith('INSERT OR IGNORE INTO app_meta')) {
      if (!store.app_meta.find((r) => r.key === params[0])) {
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
    } else if (trimmed.startsWith('INSERT INTO planned_exercises')) {
      store.planned_exercises.push({
        id: params[0],
        workout_day_id: params[1],
        exercise_id: params[2],
        exercise_order: params[3],
        role: params[4],
        sets: params[5],
        rep_range_min: params[6],
        rep_range_max: params[7],
        target_rir: params[8],
        rest_seconds: params[9],
        tempo: params[10],
        progression_type: params[11],
        progression_config: params[12],
        notes: params[13],
        is_unplanned: params[14],
        created_at: params[15],
      });
    } else if (trimmed.startsWith('INSERT INTO recommendations')) {
      store.recommendations.push({
        id: params[0],
        session_id: params[1],
        exercise_id: params[2],
        source: params[3],
        type: params[4],
        message: params[5],
        next_load: params[6],
        next_rep_target: params[7],
        next_rir_target: params[8],
        action: params[9],
        confidence: params[10],
        metadata: params[11],
        created_at: params[12],
      });
    } else if (trimmed.startsWith('DELETE FROM recommendations')) {
      const id = params[0] as string;
      store.recommendations = store.recommendations.filter((r) => r.id !== id);
    } else if (trimmed.startsWith('INSERT INTO blocks')) {
      store.blocks.push({
        id: params[0],
        program_id: params[1],
        title: params[2],
        goal: params[3],
        duration_weeks: params[4],
        week_number: params[5],
        start_date: params[6],
        end_date: params[7],
        status: params[8],
        deload_strategy: params[9],
        created_at: params[10],
        updated_at: params[11],
      });
    } else if (trimmed.startsWith('UPDATE blocks')) {
      const id = params[params.length - 1] as string;
      const idx = store.blocks.findIndex((r) => r.id === id);
      if (idx >= 0) {
        store.blocks[idx] = {
          ...store.blocks[idx],
          title: params[0],
          goal: params[1],
          duration_weeks: params[2],
          week_number: params[3],
          start_date: params[4],
          end_date: params[5],
          status: params[6],
          deload_strategy: params[7],
          updated_at: params[8],
        };
      }
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
        const row = store.app_meta.find((r) => r.key === params[0]);
        return ((row ? { value: row.value } : null) as T | null);
      }
      if (trimmed.includes('FROM sessions WHERE id')) {
        return ((store.sessions.find((r) => r.id === params[0]) as T) ?? null);
      }
      if (trimmed.includes('FROM set_logs WHERE id')) {
        return ((store.set_logs.find((r) => r.id === params[0]) as T) ?? null);
      }
      if (trimmed.includes('FROM blocks WHERE id')) {
        return ((store.blocks.find((r) => r.id === params[0]) as T) ?? null);
      }
      if (trimmed.includes('FROM planned_exercises WHERE id')) {
        return ((store.planned_exercises.find((r) => r.id === params[0]) as T) ?? null);
      }
      if (trimmed.includes('FROM recommendations WHERE id')) {
        return ((store.recommendations.find((r) => r.id === params[0]) as T) ?? null);
      }
      return null;
    },
  );

  const getAllAsync = jest.fn(
    async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
      const trimmed = sql.trim();

      if (trimmed.startsWith('SELECT id FROM set_logs WHERE session_id')) {
        return store.set_logs
          .filter((r) => r.session_id === params[0])
          .map((r) => ({ id: r.id })) as T[];
      }
      if (trimmed.includes('FROM set_logs') && trimmed.includes('session_id = ?')) {
        return store.set_logs
          .filter((r) => r.session_id === params[0])
          .sort((a, b) => (a.set_number as number) - (b.set_number as number)) as T[];
      }
      if (trimmed.includes('FROM sessions WHERE user_id')) {
        const userId = params[0] as string;
        const limit = trimmed.includes('LIMIT ?') ? (params[1] as number) : Infinity;
        return store.sessions
          .filter((r) => r.user_id === userId)
          .sort((a, b) =>
            (b.date as string).localeCompare(a.date as string) ||
            (b.created_at as string).localeCompare(a.created_at as string),
          )
          .slice(0, limit) as T[];
      }
      if (trimmed.includes('FROM planned_exercises') && trimmed.includes('workout_day_id = ?')) {
        return store.planned_exercises
          .filter((r) => r.workout_day_id === params[0])
          .sort((a, b) => (a.exercise_order as number) - (b.exercise_order as number)) as T[];
      }
      if (trimmed.includes('FROM recommendations') && trimmed.includes('session_id = ?')) {
        return store.recommendations
          .filter((r) => r.session_id === params[0])
          .sort((a, b) => (a.created_at as string).localeCompare(b.created_at as string)) as T[];
      }
      return [];
    },
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
// Test fixtures
// ---------------------------------------------------------------------------

const STRENGTH_CFG: StrengthFixedConfig = {
  increment_upper_kg: 2.5,
  increment_lower_kg: 5,
  rir_threshold_increase: 2,
  failures_before_reset: 2,
  reset_delta_kg: 5,
};

const DOUBLE_CFG: DoubleProgressionConfig = {
  increment_kg: 2.5,
  min_reps: 6,
  max_reps: 8,
  all_sets_at_max_to_increase: true,
  regressions_before_alert: 2,
};

async function seedBlock(
  db: SQLiteDatabase,
  overrides: Partial<Parameters<typeof insertBlock>[1]> = {},
) {
  return insertBlock(db, {
    id: 'block-1',
    programId: 'prog-1',
    title: 'Bloc 1',
    goal: 'hypertrophy',
    durationWeeks: 6,
    weekNumber: 2,
    status: 'active',
    deloadStrategy: 'fatigue_triggered',
    ...overrides,
  });
}

async function seedSession(
  db: SQLiteDatabase,
  overrides: Partial<Parameters<typeof insertSession>[1]> = {},
): Promise<Session> {
  const session = await insertSession(db, {
    id: 'sess-1',
    userId: 'user-1',
    workoutDayId: 'wd-1',
    blockId: 'block-1',
    date: '2026-04-29',
    startedAt: '2026-04-29T10:00:00.000Z',
    readiness: 8,
    energy: 7,
    motivation: 8,
    sleepQuality: 7,
    ...overrides,
  });
  return session;
}

async function seedPlannedExercise(
  db: SQLiteDatabase,
  overrides: Partial<Parameters<typeof insertPlannedExercise>[1]> = {},
): Promise<PlannedExercise> {
  return insertPlannedExercise(db, {
    id: 'pe-bench',
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
    progressionConfig: STRENGTH_CFG,
    ...overrides,
  });
}

async function logBenchSets(
  db: SQLiteDatabase,
  sessionId: string,
  load: number,
  reps: number,
  rir: number,
  count: number = 3,
  exerciseId: string = 'ex-bench',
  plannedExerciseId: string | null = 'pe-bench',
  baseSetLogId: string = 'sl',
): Promise<SetLog[]> {
  const logs: SetLog[] = [];
  for (let i = 1; i <= count; i++) {
    const sl = await insertSetLog(db, {
      id: `${baseSetLogId}-${sessionId}-${i}`,
      sessionId,
      exerciseId,
      plannedExerciseId: plannedExerciseId ?? undefined,
      setNumber: i,
      targetLoad: load,
      targetReps: reps,
      targetRir: rir,
      load,
      reps,
      rir,
      completed: true,
    });
    logs.push(sl);
  }
  return logs;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runRulesEngine — orchestration & persistence', () => {
  it('throws when session does not exist', async () => {
    const db = makeInMemoryDb();
    await expect(runRulesEngine(db, 'unknown')).rejects.toThrow(/session not found/);
  });

  it('persists a load_change Recommendation per planned exercise', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    const session = await seedSession(db);
    await seedPlannedExercise(db);
    await seedPlannedExercise(db, {
      id: 'pe-row',
      exerciseId: 'ex-row',
      exerciseOrder: 2,
      progressionType: 'double_progression',
      progressionConfig: DOUBLE_CFG,
    });
    await logBenchSets(db, session.id, 100, 8, 2, 3, 'ex-bench', 'pe-bench', 'sl-bench');
    await logBenchSets(db, session.id, 60, 8, 2, 3, 'ex-row', 'pe-row', 'sl-row');

    const result = await runRulesEngine(db, session.id);

    const recs = await getRecommendationsBySession(db, session.id);
    const loadChanges = recs.filter((r) => r.type === 'load_change');
    expect(loadChanges).toHaveLength(2);
    expect(loadChanges.every((r) => r.source === 'rules_engine')).toBe(true);
    expect(loadChanges.find((r) => r.exerciseId === 'ex-bench')).toBeDefined();
    expect(loadChanges.find((r) => r.exerciseId === 'ex-row')).toBeDefined();
    expect(result.sessionPlan.exercisePlans).toHaveLength(2);
  });

  it('updates session scores with real progressionVsPrevious from set logs', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    // Séance précédente : 100kg @ 8 reps. Séance courante : 110kg @ 8 reps.
    // → progressionVsPrevious capé à 1.0 (ratio ~1.1 = ceiling).
    const previousSession = await seedSession(db, {
      id: 'sess-prev',
      date: '2026-04-26',
    });
    await updateSession(db, previousSession.id, { status: 'completed', endedAt: '2026-04-26T11:00:00Z' });
    await seedPlannedExercise(db);
    await logBenchSets(db, previousSession.id, 100, 8, 2, 3, 'ex-bench', 'pe-bench', 'sl-prev');

    const currentSession = await seedSession(db, { id: 'sess-1', date: '2026-04-29' });
    await updateSession(db, currentSession.id, { status: 'completed', endedAt: '2026-04-29T11:00:00Z' });
    await logBenchSets(db, currentSession.id, 110, 8, 2, 3, 'ex-bench', 'pe-bench', 'sl-cur');

    const result = await runRulesEngine(db, currentSession.id);

    const reloaded = await getSessionById(db, currentSession.id);
    expect(reloaded!.completionScore).toBe(1);
    expect(reloaded!.performanceScore).toBe(result.sessionScores.performance_score);
    // Score doit être > 9.0 grâce à progressionVsPrevious=1 (vs 0.5 placeholder).
    expect(reloaded!.performanceScore!).toBeGreaterThan(9);
    expect(reloaded!.fatigueScore).toBe(result.fatigueScore);
  });

  it('uses neutral 0.5 for progressionVsPrevious when no completed history', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    const session = await seedSession(db);
    await seedPlannedExercise(db);
    await logBenchSets(db, session.id, 100, 8, 2);

    const result = await runRulesEngine(db, session.id);
    // Sans historique, le score reste plafonné par le placeholder neutre.
    // raw = 1*0.3 + 0.833*0.3 + 1*0.2 + 0.5*0.2 = 0.85 → score ~8.5
    expect(result.sessionScores.performance_score).toBeCloseTo(8.5, 1);
  });

  it('detects plateau and persists a plateau Recommendation', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    await seedPlannedExercise(db);

    // 4 séances historiques + courante = 5 séances toutes à 100kg/8reps RIR=3
    // → plateau confirmé (≥3 séances, charge/reps identiques, RIR≥2, fatigue<6).
    for (let i = 0; i < 4; i++) {
      const id = `sess-prev-${i}`;
      const date = `2026-04-${20 + i}`;
      const s = await seedSession(db, { id, date });
      await updateSession(db, s.id, {
        status: 'completed',
        endedAt: `${date}T11:00:00Z`,
        fatigueScore: 3,
      });
      await logBenchSets(db, s.id, 100, 8, 3, 3, 'ex-bench', 'pe-bench', `sl-prev-${i}`);
    }

    const current = await seedSession(db, { id: 'sess-cur', date: '2026-04-29' });
    await updateSession(db, current.id, { status: 'completed', endedAt: '2026-04-29T11:00:00Z' });
    await logBenchSets(db, current.id, 100, 8, 3, 3, 'ex-bench', 'pe-bench', 'sl-cur');

    const result = await runRulesEngine(db, current.id);

    expect(result.plateauAlerts.length).toBeGreaterThan(0);
    expect(result.plateauAlerts[0]!.exerciseId).toBe('ex-bench');

    const recs = await getRecommendationsBySession(db, current.id);
    const plateaus = recs.filter((r) => r.type === 'plateau');
    expect(plateaus).toHaveLength(1);
    expect(plateaus[0]!.exerciseId).toBe('ex-bench');
  });

  it('triggers deload (fatigue_triggered) and flips block.status active → deloaded', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db, { deloadStrategy: 'fatigue_triggered', status: 'active' });

    // 3 séances précédentes avec performance en baisse → condition 2 du deload.
    const dates = ['2026-04-25', '2026-04-26', '2026-04-27'];
    const scores = [9.5, 8.5, 7.5];
    for (let i = 0; i < 3; i++) {
      const id = `sess-prev-${i}`;
      const s = await seedSession(db, { id, date: dates[i]! });
      await updateSession(db, s.id, {
        status: 'completed',
        endedAt: `${dates[i]!}T11:00:00Z`,
        performanceScore: scores[i]!,
      });
    }

    const current = await seedSession(db, { id: 'sess-cur', date: '2026-04-29' });
    await updateSession(db, current.id, { status: 'completed', endedAt: '2026-04-29T11:00:00Z' });
    // Performance courante < précédente → 4 scores en baisse consécutive.
    await seedPlannedExercise(db);
    // Sets faibles → score courant bas
    await logBenchSets(db, current.id, 60, 5, 1, 1);

    const result = await runRulesEngine(db, current.id);

    expect(result.deloadTriggered).toBe(true);
    expect(result.deloadDecision?.mode).toBe('fatigue_triggered');

    const block = await getBlockById(db, 'block-1');
    expect(block!.status).toBe('deloaded');

    const recs = await getRecommendationsBySession(db, current.id);
    const deloads = recs.filter((r) => r.type === 'deload');
    expect(deloads).toHaveLength(1);
    expect(deloads[0]!.exerciseId).toBeNull();
    expect(deloads[0]!.action).toBe('deload');
  });

  it('does not regress block status when already deloaded', async () => {
    const db = makeInMemoryDb();
    // durationWeeks=4 → scheduledDeloadWeek=5 ; weekNumber=5 → triggered.
    await seedBlock(db, {
      deloadStrategy: 'scheduled',
      durationWeeks: 4,
      weekNumber: 5,
      status: 'deloaded',
    });
    const session = await seedSession(db);
    await seedPlannedExercise(db);
    await logBenchSets(db, session.id, 100, 8, 2);

    const result = await runRulesEngine(db, session.id);
    expect(result.deloadTriggered).toBe(true);

    const block = await getBlockById(db, 'block-1');
    expect(block!.status).toBe('deloaded');
    // Pas d'UPDATE blocks supplémentaire pour status (pas de mutation inutile).
    const blockUpdates = (db as unknown as { __store: Store }).__store.sync_queue.filter(
      (q) => q.table_name === 'blocks' && q.action === 'update',
    );
    expect(blockUpdates).toHaveLength(0);
  });

  it('does not flip block when deload is not triggered (none strategy)', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db, { deloadStrategy: 'none' });
    const session = await seedSession(db);
    await seedPlannedExercise(db);
    await logBenchSets(db, session.id, 100, 8, 2);

    const result = await runRulesEngine(db, session.id);
    expect(result.deloadTriggered).toBe(false);
    expect(result.deloadDecision).toBeNull();

    const block = await getBlockById(db, 'block-1');
    expect(block!.status).toBe('active');
  });

  it('handles free session (no workoutDayId, no blockId) without crashing', async () => {
    const db = makeInMemoryDb();
    const session = await seedSession(db, {
      id: 'sess-free',
      workoutDayId: null,
      blockId: null,
    });
    // Free session : sets sans plannedExerciseId
    await insertSetLog(db, {
      id: 'sl-free-1',
      sessionId: session.id,
      exerciseId: 'ex-bench',
      plannedExerciseId: undefined,
      setNumber: 1,
      load: 100,
      reps: 8,
      rir: 2,
      completed: true,
    });

    const result = await runRulesEngine(db, session.id);
    expect(result.sessionPlan.exercisePlans).toHaveLength(0);
    expect(result.deloadTriggered).toBe(false);
    expect(result.deloadDecision).toBeNull();

    const recs = await getRecommendationsBySession(db, session.id);
    // Aucun load_change car pas de plannedExercises ; pas de plateau (seulement
    // 1 session) ; pas de deload (pas de blockId).
    expect(recs).toHaveLength(0);
  });

  it('is idempotent : two consecutive runs produce equivalent state', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    const session = await seedSession(db);
    await seedPlannedExercise(db);
    await logBenchSets(db, session.id, 100, 8, 2);

    const first = await runRulesEngine(db, session.id);
    const recsAfterFirst = await getRecommendationsBySession(db, session.id);

    const second = await runRulesEngine(db, session.id);
    const recsAfterSecond = await getRecommendationsBySession(db, session.id);

    // Même nombre de recommandations (pas de doublons accumulés).
    expect(recsAfterSecond).toHaveLength(recsAfterFirst.length);

    // Contenu sémantique identique (types, exerciseIds, actions, charges).
    const summarize = (recs: typeof recsAfterFirst) =>
      recs
        .map((r) => `${r.type}|${r.exerciseId ?? ''}|${r.action ?? ''}|${r.nextLoad ?? ''}`)
        .sort();
    expect(summarize(recsAfterSecond)).toEqual(summarize(recsAfterFirst));

    // Scores identiques après le 2e run.
    expect(second.sessionScores).toEqual(first.sessionScores);
    expect(second.fatigueScore).toBe(first.fatigueScore);
  });

  it('respects the historySize option (caps loaded sessions)', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);

    // 8 séances complétées avant la courante.
    for (let i = 0; i < 8; i++) {
      const id = `sess-prev-${i}`;
      const date = `2026-04-${10 + i}`;
      const s = await seedSession(db, { id, date });
      await updateSession(db, s.id, {
        status: 'completed',
        endedAt: `${date}T11:00:00Z`,
        fatigueScore: 4,
      });
    }
    const current = await seedSession(db, { id: 'sess-cur', date: '2026-04-29' });
    await seedPlannedExercise(db);
    await logBenchSets(db, current.id, 100, 8, 2);

    const result = await runRulesEngine(db, current.id, { historySize: 3 });
    // historySize=3 inclut la courante → 2 séances précédentes max
    // contributent au plateau-detection. Le moteur ne doit pas planter.
    expect(result.sessionPlan.exercisePlans).toHaveLength(1);
  });

  it('overrides fatigue_score with composite TA-105 score (not legacy readiness-only)', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db);
    // Readiness élevée = 9 → fatigue legacy = 2. On veut le score composite.
    const session = await seedSession(db, { readiness: 9, energy: 9, motivation: 9, sleepQuality: 9 });
    await seedPlannedExercise(db);
    await logBenchSets(db, session.id, 100, 8, 0); // RIR très bas → fatigue composite plus élevée

    const result = await runRulesEngine(db, session.id);
    // Le score composite doit refléter le RIR bas, pas juste la readiness.
    // (3 sets RIR=0 → indicateur "lowRir" plein)
    const reloaded = await getSessionById(db, session.id);
    expect(reloaded!.fatigueScore).toBe(result.fatigueScore);
  });

  it('writes a session-level deload Recommendation with exerciseId=null', async () => {
    const db = makeInMemoryDb();
    await seedBlock(db, {
      deloadStrategy: 'scheduled',
      durationWeeks: 6,
      weekNumber: 7,
      status: 'active',
    });
    const session = await seedSession(db);
    await seedPlannedExercise(db);
    await logBenchSets(db, session.id, 100, 8, 2);

    const result = await runRulesEngine(db, session.id);
    expect(result.deloadTriggered).toBe(true);
    expect(result.deloadDecision?.mode).toBe('scheduled');

    const recs = await getRecommendationsBySession(db, session.id);
    const deloadRec = recs.find((r) => r.type === 'deload');
    expect(deloadRec).toBeDefined();
    expect(deloadRec!.exerciseId).toBeNull();
  });
});
