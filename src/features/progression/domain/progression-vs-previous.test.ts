import { computeProgressionVsPrevious } from './progression-vs-previous';
import type { SetLog } from '@/types/set-log';

function makeSetLog(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'sl',
    sessionId: 'sess',
    exerciseId: 'ex-1',
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
    createdAt: '2026-04-29T10:00:00.000Z',
    updatedAt: '2026-04-29T10:00:00.000Z',
    ...overrides,
  };
}

describe('computeProgressionVsPrevious', () => {
  describe('no history', () => {
    it('returns 0.5 when previousSetLogs is null', () => {
      const current = [makeSetLog()];
      expect(computeProgressionVsPrevious(current, null)).toBe(0.5);
    });

    it('returns 0.5 when previousSetLogs is empty', () => {
      const current = [makeSetLog()];
      expect(computeProgressionVsPrevious(current, [])).toBe(0.5);
    });

    it('returns 0.5 when no shared exercises between sessions', () => {
      const current = [makeSetLog({ exerciseId: 'ex-1' })];
      const previous = [makeSetLog({ id: 'p1', exerciseId: 'ex-2' })];
      expect(computeProgressionVsPrevious(current, previous)).toBe(0.5);
    });

    it('returns 0.5 when no completed sets in current', () => {
      const current = [makeSetLog({ completed: false })];
      const previous = [makeSetLog({ id: 'p1' })];
      expect(computeProgressionVsPrevious(current, previous)).toBe(0.5);
    });
  });

  describe('stable performance', () => {
    it('returns ~0.75 when e1RM is identical across sessions', () => {
      // ratio = 1.0 → score = (1.0 - 0.7) / (1.1 - 0.7) = 0.75
      const current = [
        makeSetLog({ id: 'c1', load: 100, reps: 8 }),
        makeSetLog({ id: 'c2', load: 100, reps: 8 }),
      ];
      const previous = [
        makeSetLog({ id: 'p1', load: 100, reps: 8 }),
        makeSetLog({ id: 'p2', load: 100, reps: 8 }),
      ];
      expect(computeProgressionVsPrevious(current, previous)).toBeCloseTo(0.75, 2);
    });
  });

  describe('progression detected', () => {
    it('returns 1.0 when current e1RM is much higher than previous', () => {
      // current load 120@8 vs previous 100@8 → ratio = 1.2, well above ceiling.
      const current = [makeSetLog({ load: 120, reps: 8 })];
      const previous = [makeSetLog({ id: 'p1', load: 100, reps: 8 })];
      expect(computeProgressionVsPrevious(current, previous)).toBe(1);
    });

    it('returns >0.75 for moderate progression', () => {
      // 105 vs 100 → ratio ≈ 1.05, score = (1.05 - 0.7) / 0.4 = 0.875
      const current = [makeSetLog({ load: 105, reps: 8 })];
      const previous = [makeSetLog({ id: 'p1', load: 100, reps: 8 })];
      const result = computeProgressionVsPrevious(current, previous);
      expect(result).toBeGreaterThan(0.75);
      expect(result).toBeLessThan(1);
    });

    it('uses Epley : extra reps at same load count as progression', () => {
      // current 100@10 = 133.3, previous 100@8 = 126.6 → ratio ~1.053
      const current = [makeSetLog({ load: 100, reps: 10 })];
      const previous = [makeSetLog({ id: 'p1', load: 100, reps: 8 })];
      const result = computeProgressionVsPrevious(current, previous);
      expect(result).toBeGreaterThan(0.75);
    });
  });

  describe('regression detected', () => {
    it('returns 0 when current e1RM is much lower than previous', () => {
      // current 70@8 vs previous 100@8 → ratio = 0.7, hits floor.
      const current = [makeSetLog({ load: 70, reps: 8 })];
      const previous = [makeSetLog({ id: 'p1', load: 100, reps: 8 })];
      expect(computeProgressionVsPrevious(current, previous)).toBe(0);
    });

    it('returns <0.75 for moderate regression', () => {
      // 90 vs 100 → ratio ≈ 0.9, score = (0.9 - 0.7) / 0.4 = 0.5
      const current = [makeSetLog({ load: 90, reps: 8 })];
      const previous = [makeSetLog({ id: 'p1', load: 100, reps: 8 })];
      const result = computeProgressionVsPrevious(current, previous);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.75);
    });
  });

  describe('multiple exercises', () => {
    it('averages ratios across shared exercises only', () => {
      // ex-1 : 100→105 ratio 1.05 ; ex-2 : 50→50 ratio 1.0
      // mean = 1.025 → score = (1.025 - 0.7) / 0.4 = 0.8125
      const current = [
        makeSetLog({ id: 'c1', exerciseId: 'ex-1', load: 105, reps: 8 }),
        makeSetLog({ id: 'c2', exerciseId: 'ex-2', load: 50, reps: 10 }),
      ];
      const previous = [
        makeSetLog({ id: 'p1', exerciseId: 'ex-1', load: 100, reps: 8 }),
        makeSetLog({ id: 'p2', exerciseId: 'ex-2', load: 50, reps: 10 }),
      ];
      const result = computeProgressionVsPrevious(current, previous);
      expect(result).toBeCloseTo(0.8125, 2);
    });

    it('ignores exercises only present in current session', () => {
      // ex-1 stable → score 0.75. ex-3 only in current, ignored.
      const current = [
        makeSetLog({ id: 'c1', exerciseId: 'ex-1', load: 100, reps: 8 }),
        makeSetLog({ id: 'c2', exerciseId: 'ex-3', load: 60, reps: 10 }),
      ];
      const previous = [
        makeSetLog({ id: 'p1', exerciseId: 'ex-1', load: 100, reps: 8 }),
      ];
      expect(computeProgressionVsPrevious(current, previous)).toBeCloseTo(0.75, 2);
    });
  });

  describe('edge cases', () => {
    it('ignores incomplete sets', () => {
      const current = [
        makeSetLog({ id: 'c1', load: 110, reps: 8 }),
        makeSetLog({ id: 'c2', load: 50, reps: 5, completed: false }),
      ];
      const previous = [makeSetLog({ id: 'p1', load: 110, reps: 8 })];
      // Only completed set counted → identical → ~0.75
      expect(computeProgressionVsPrevious(current, previous)).toBeCloseTo(0.75, 2);
    });

    it('ignores sets without load or reps', () => {
      const current = [
        makeSetLog({ id: 'c1', load: 100, reps: 8 }),
        makeSetLog({ id: 'c2', load: null, reps: null }),
      ];
      const previous = [makeSetLog({ id: 'p1', load: 100, reps: 8 })];
      expect(computeProgressionVsPrevious(current, previous)).toBeCloseTo(0.75, 2);
    });

    it('returns 0.5 when no exercise has comparable e1RM', () => {
      const current = [makeSetLog({ load: null, reps: null })];
      const previous = [makeSetLog({ id: 'p1', load: 100, reps: 8 })];
      expect(computeProgressionVsPrevious(current, previous)).toBe(0.5);
    });

    it('handles previous e1RM of zero gracefully', () => {
      // load=0 → filtered out by averageE1rmForExercise (load > 0 required)
      const current = [makeSetLog({ load: 100, reps: 8 })];
      const previous = [makeSetLog({ id: 'p1', load: 0, reps: 8 })];
      expect(computeProgressionVsPrevious(current, previous)).toBe(0.5);
    });
  });
});
