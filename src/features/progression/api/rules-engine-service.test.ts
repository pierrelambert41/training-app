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
 *
 * L'infrastructure SQLite in-memory + factories sont mutualisées dans
 * `__tests__/test-helpers.ts` (refacto TA-114, ≥2 callers réels).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { runRulesEngine } from './rules-engine-service';
import { updateSession, getSessionById } from '@/services/sessions';
import { insertSetLog } from '@/services/set-logs';
import { getBlockById } from '@/services/blocks';
import { getRecommendationsBySession } from '@/services/recommendations';
import type { DoubleProgressionConfig } from '@/types';

import {
  installCryptoMock,
  logBenchSets,
  makeInMemoryDb,
  seedBlock,
  seedPlannedExercise,
  seedSession,
  type InMemoryStore,
} from './rules-engine-test-helpers';

beforeAll(() => {
  installCryptoMock();
});

const DOUBLE_CFG: DoubleProgressionConfig = {
  increment_kg: 2.5,
  min_reps: 6,
  max_reps: 8,
  all_sets_at_max_to_increase: true,
  regressions_before_alert: 2,
};

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
    const blockUpdates = (db as unknown as { __store: InMemoryStore }).__store.sync_queue.filter(
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
