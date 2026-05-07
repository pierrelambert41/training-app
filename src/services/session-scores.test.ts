import { computeSessionScores, performanceScoreLabel } from './session-scores';
import type { Session } from '@/types/session';
import type { SetLog } from '@/types/set-log';
import type { PlannedExercise } from '@/types/planned-exercise';

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

function makePe(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
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
    progressionConfig: {},
    notes: null,
    isUnplanned: false,
    createdAt: '2026-04-25T00:00:00.000Z',
    ...overrides,
  };
}

function makeSetLog(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'sl-1',
    sessionId: 'sess-1',
    exerciseId: 'ex-bench',
    plannedExerciseId: 'pe-1',
    setNumber: 1,
    targetLoad: 100,
    targetReps: 8,
    targetRir: 2,
    load: 100,
    reps: 8,
    rir: 2,
    durationSeconds: null,
    distanceMeters: null,
    completed: true,
    side: null,
    notes: null,
    createdAt: '2026-04-25T10:05:00.000Z',
    updatedAt: '2026-04-25T10:05:00.000Z',
    ...overrides,
  };
}

describe('computeSessionScores', () => {
  describe('excellente — all sets hit target, perfect RIR, high readiness', () => {
    it('returns performance_score >= 8, completion_score = 1, low fatigue', () => {
      const session = makeSession({ readiness: 9 });
      const pe = makePe({ sets: 3 });
      const setLogs: SetLog[] = [
        makeSetLog({ id: 'sl-1', setNumber: 1, targetLoad: 100, targetReps: 8, targetRir: 2, load: 100, reps: 8, rir: 2 }),
        makeSetLog({ id: 'sl-2', setNumber: 2, targetLoad: 100, targetReps: 8, targetRir: 2, load: 100, reps: 8, rir: 2 }),
        makeSetLog({ id: 'sl-3', setNumber: 3, targetLoad: 100, targetReps: 8, targetRir: 2, load: 100, reps: 8, rir: 2 }),
      ];

      const result = computeSessionScores(session, setLogs, [pe]);

      expect(result.completion_score).toBe(1);
      expect(result.performance_score).toBeGreaterThanOrEqual(8);
      expect(result.performance_score).toBeLessThanOrEqual(10);
      expect(result.fatigue_score).toBe(2);
      expect(performanceScoreLabel(result.performance_score)).toBe('Excellente');
    });
  });

  describe('réussie — 2/3 sets done, moderate RIR deviation', () => {
    it('returns performance_score between 6 and 8, labeled Réussie', () => {
      const session = makeSession({ readiness: 7 });
      const pe = makePe({ sets: 3 });
      // 2 of 3 sets logged, load slightly below target, noticeable RIR miss
      const setLogs: SetLog[] = [
        makeSetLog({ id: 'sl-1', setNumber: 1, targetLoad: 100, targetReps: 8, targetRir: 2, load: 90, reps: 7, rir: 4 }),
        makeSetLog({ id: 'sl-2', setNumber: 2, targetLoad: 100, targetReps: 8, targetRir: 2, load: 90, reps: 7, rir: 4 }),
      ];

      const result = computeSessionScores(session, setLogs, [pe]);

      // completion = 2/3 ≈ 0.667
      // targetAchievement = (180/200) * (14/16) = 0.9 * 0.875 = 0.7875; normalized = 0.7875/1.2 = 0.656
      // rir: diff=2 each → (1-2/5)*2/2 = 0.6
      // score = (0.667*0.3 + 0.656*0.3 + 0.6*0.2 + 0.5*0.2)*10 ≈ 6.6
      expect(result.performance_score).toBeGreaterThanOrEqual(6);
      expect(result.performance_score).toBeLessThan(8);
      expect(performanceScoreLabel(result.performance_score)).toBe('Réussie');
    });
  });

  describe('moyenne — partial completion, significant RIR miss', () => {
    it('returns performance_score between 4 and 6', () => {
      const session = makeSession({ readiness: 5 });
      const pe = makePe({ sets: 4 });
      const setLogs: SetLog[] = [
        makeSetLog({ id: 'sl-1', setNumber: 1, targetLoad: 100, targetReps: 8, targetRir: 2, load: 80, reps: 6, rir: 4 }),
        makeSetLog({ id: 'sl-2', setNumber: 2, targetLoad: 100, targetReps: 8, targetRir: 2, load: 80, reps: 6, rir: 4 }),
      ];

      const result = computeSessionScores(session, setLogs, [pe]);

      expect(result.completion_score).toBe(0.5);
      expect(result.performance_score).toBeGreaterThanOrEqual(4);
      expect(result.performance_score).toBeLessThanOrEqual(6);
      expect(result.fatigue_score).toBe(5);
      expect(performanceScoreLabel(result.performance_score)).toBe('Moyenne');
    });
  });

  describe('difficile — few sets done, low load vs target', () => {
    it('returns performance_score between 2 and 4', () => {
      const session = makeSession({ readiness: 3 });
      const pe = makePe({ sets: 4 });
      const setLogs: SetLog[] = [
        makeSetLog({ id: 'sl-1', setNumber: 1, targetLoad: 100, targetReps: 8, targetRir: 2, load: 60, reps: 5, rir: 0 }),
      ];

      const result = computeSessionScores(session, setLogs, [pe]);

      expect(result.completion_score).toBe(0.25);
      expect(result.performance_score).toBeGreaterThanOrEqual(2);
      expect(result.performance_score).toBeLessThanOrEqual(4);
      expect(result.fatigue_score).toBe(7);
      expect(performanceScoreLabel(result.performance_score)).toBe('Difficile');
    });
  });

  describe('ratée — nothing logged, very low readiness', () => {
    it('returns performance_score <= 2, completion_score = 0, high fatigue', () => {
      const session = makeSession({ readiness: 1 });
      const pe = makePe({ sets: 3 });
      const setLogs: SetLog[] = [];

      const result = computeSessionScores(session, setLogs, [pe]);

      expect(result.completion_score).toBe(0);
      // score = 0*0.3 + 0*0.3 + 0.5*0.2 + 0.5*0.2 = 0.2 * 10 = 2.0
      expect(result.performance_score).toBeLessThanOrEqual(2);
      expect(result.fatigue_score).toBe(9);
    });

    it('labels score < 2 as À retravailler', () => {
      expect(performanceScoreLabel(1.5)).toBe('À retravailler');
      expect(performanceScoreLabel(0)).toBe('À retravailler');
    });
  });

  describe('previousSetLogs — progressionVsPrevious computation', () => {
    it('uses neutral contribution (0.5) when previousSetLogs is null (no history)', () => {
      // no previous session → progressionVsPrevious = 0.5 (neutral)
      // raw = 1.0*0.3 + 0.833*0.3 + 1.0*0.2 + 0.5*0.2 = 0.85 → score = 8.5
      const session = makeSession({ readiness: 8 });
      const pe = makePe({ sets: 1 });
      const setLogs: SetLog[] = [
        makeSetLog({ id: 'sl-1', setNumber: 1, targetLoad: 100, targetReps: 8, targetRir: 2, load: 100, reps: 8, rir: 2 }),
      ];

      const result = computeSessionScores(session, setLogs, [pe], null);

      expect(result.performance_score).toBeCloseTo(8.5, 1);
    });

    it('raises performance_score when current e1RM is much higher than previous (+5%)', () => {
      // current 105@8 vs previous 100@8 → ratio 1.05 → progressionScore = (1.05-0.7)/0.4 = 0.875
      // raw = 1.0*0.3 + 0.833*0.3 + 1.0*0.2 + 0.875*0.2 ≈ 0.925 → score ≈ 9.25
      const session = makeSession({ readiness: 8 });
      const pe = makePe({ sets: 1, exerciseId: 'ex-bench' });
      const current: SetLog[] = [
        makeSetLog({ id: 'c1', setNumber: 1, exerciseId: 'ex-bench', targetLoad: 105, targetReps: 8, targetRir: 2, load: 105, reps: 8, rir: 2 }),
      ];
      const previous: SetLog[] = [
        makeSetLog({ id: 'p1', setNumber: 1, exerciseId: 'ex-bench', sessionId: 'sess-prev', load: 100, reps: 8, completed: true }),
      ];

      const result = computeSessionScores(session, current, [pe], previous);

      expect(result.performance_score).toBeGreaterThan(8.5);
    });

    it('lowers performance_score when current e1RM is 10% below previous (regression)', () => {
      // current 90@8 vs previous 100@8 → ratio 0.9 → progressionScore = (0.9-0.7)/0.4 = 0.5
      // raw = 1.0*0.3 + 0.833*0.3 + 1.0*0.2 + 0.5*0.2 = 0.85 → score ≈ 8.5
      // vs severe regression: 70@8 → ratio 0.7 → score = 0 → raw = 0.75 → 7.5
      const session = makeSession({ readiness: 8 });
      const pe = makePe({ sets: 1, exerciseId: 'ex-bench' });
      const current: SetLog[] = [
        makeSetLog({ id: 'c1', setNumber: 1, exerciseId: 'ex-bench', targetLoad: 70, targetReps: 8, targetRir: 2, load: 70, reps: 8, rir: 2 }),
      ];
      const previous: SetLog[] = [
        makeSetLog({ id: 'p1', setNumber: 1, exerciseId: 'ex-bench', sessionId: 'sess-prev', load: 100, reps: 8, completed: true }),
      ];

      const result = computeSessionScores(session, current, [pe], previous);

      expect(result.performance_score).toBeCloseTo(7.5, 1);
    });

    it('returns neutral score (0.5) when no shared exercises between sessions', () => {
      // current has ex-bench, previous has ex-squat → no overlap → progressionVsPrevious = 0.5
      // raw = 1.0*0.3 + 0.833*0.3 + 1.0*0.2 + 0.5*0.2 = 0.85 → score = 8.5
      const session = makeSession({ readiness: 8 });
      const pe = makePe({ sets: 1, exerciseId: 'ex-bench' });
      const current: SetLog[] = [
        makeSetLog({ id: 'c1', setNumber: 1, exerciseId: 'ex-bench', targetLoad: 100, targetReps: 8, targetRir: 2, load: 100, reps: 8, rir: 2 }),
      ];
      const previous: SetLog[] = [
        makeSetLog({ id: 'p1', setNumber: 1, exerciseId: 'ex-squat', sessionId: 'sess-prev', load: 100, reps: 8, completed: true }),
      ];

      const result = computeSessionScores(session, current, [pe], previous);

      expect(result.performance_score).toBeCloseTo(8.5, 1);
    });
  });

  describe('edge cases', () => {
    it('returns neutral performance_score when no planned exercises (free session)', () => {
      const session = makeSession({ readiness: null });
      const setLogs: SetLog[] = [];

      const result = computeSessionScores(session, setLogs, []);

      expect(result.completion_score).toBe(1);
      expect(result.fatigue_score).toBe(5);
    });

    it('caps performance_score at 10', () => {
      const session = makeSession({ readiness: 10 });
      const pe = makePe({ sets: 3 });
      const setLogs: SetLog[] = [
        makeSetLog({ id: 'sl-1', setNumber: 1, targetLoad: 100, targetReps: 8, targetRir: 2, load: 120, reps: 10, rir: 2 }),
        makeSetLog({ id: 'sl-2', setNumber: 2, targetLoad: 100, targetReps: 8, targetRir: 2, load: 120, reps: 10, rir: 2 }),
        makeSetLog({ id: 'sl-3', setNumber: 3, targetLoad: 100, targetReps: 8, targetRir: 2, load: 120, reps: 10, rir: 2 }),
      ];

      const result = computeSessionScores(session, setLogs, [pe]);

      expect(result.performance_score).toBeLessThanOrEqual(10);
    });
  });
});
