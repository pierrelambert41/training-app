import { computeDoubleProgression } from './double-progression';
import type { DoubleProgressionConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';
import type { ProgressionDecision } from '../../types/progression-decision';

const BASE_CONFIG: DoubleProgressionConfig = {
  increment_kg: 2.5,
  min_reps: 6,
  max_reps: 8,
  all_sets_at_max_to_increase: true,
  regressions_before_alert: 2,
};

function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'set-1',
    sessionId: 'session-1',
    exerciseId: 'ex-1',
    plannedExerciseId: 'pe-1',
    setNumber: 1,
    targetLoad: 60,
    targetReps: 8,
    targetRir: 2,
    load: 60,
    reps: 8,
    rir: 2,
    durationSeconds: null,
    distanceMeters: null,
    completed: true,
    side: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeHistory(actions: ProgressionDecision['action'][]): ProgressionDecision[] {
  return actions.map((action) => ({
    action,
    next_load: 60,
    next_rep_target: 6,
    next_rir_target: null,
    reason: 'test',
  }));
}

describe('computeDoubleProgression', () => {
  describe('cas edge — setLogs vide', () => {
    it('retourne maintain avec next_load null', () => {
      const result = computeDoubleProgression(BASE_CONFIG, [], []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBeNull();
      expect(result.next_rep_target).toBe(6);
    });
  });

  describe('toutes séries au max de la fourchette', () => {
    it('augmente la charge et remet les reps au min', () => {
      const sets = [
        makeSet({ setNumber: 1, reps: 8, load: 60 }),
        makeSet({ setNumber: 2, reps: 8, load: 60 }),
        makeSet({ setNumber: 3, reps: 8, load: 60 }),
      ];
      const result = computeDoubleProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(62.5);
      expect(result.next_rep_target).toBe(6);
    });

    it('augmente si reps > max_reps', () => {
      const sets = [makeSet({ reps: 10, load: 60 })];
      const result = computeDoubleProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
    });
  });

  describe('progression partielle', () => {
    it('maintient la charge et propose un rep target incrémenté', () => {
      const sets = [
        makeSet({ setNumber: 1, reps: 8, load: 60 }),
        makeSet({ setNumber: 2, reps: 6, load: 60 }),
        makeSet({ setNumber: 3, reps: 6, load: 60 }),
      ];
      const result = computeDoubleProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBe(60);
      expect(result.next_rep_target).toBeGreaterThanOrEqual(6);
    });

    it('ne dépasse pas max_reps dans next_rep_target', () => {
      const sets = [
        makeSet({ reps: 7 }),
        makeSet({ reps: 7 }),
      ];
      const result = computeDoubleProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
      expect(result.next_rep_target).toBeLessThanOrEqual(8);
    });
  });

  describe('régressions consécutives', () => {
    it('déclenche alerte fatigue après regressions_before_alert decreases', () => {
      const sets = [makeSet({ reps: 4, load: 60 })];
      const history = makeHistory(['decrease', 'decrease']);
      const result = computeDoubleProgression(BASE_CONFIG, sets, history);
      expect(result.action).toBe('decrease');
    });

    it('ne déclenche pas alerte si 1 seule régression', () => {
      const sets = [makeSet({ reps: 6, load: 60 })];
      const history = makeHistory(['decrease']);
      const result = computeDoubleProgression(BASE_CONFIG, sets, history);
      expect(result.action).not.toBe('decrease');
    });
  });

  describe('config incomplète — valeurs par défaut', () => {
    it('utilise les valeurs par défaut si config vide', () => {
      const partialConfig = {} as DoubleProgressionConfig;
      const sets = [makeSet({ reps: 8, load: 60 })];
      const result = computeDoubleProgression(partialConfig, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(62.5);
    });
  });
});
