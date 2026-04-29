import { computeAccessoryLinear } from './accessory-linear';
import type { AccessoryLinearConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';

const BASE_CONFIG: AccessoryLinearConfig = {
  increment_kg: 1.25,
  min_reps: 10,
  max_reps: 15,
  all_sets_at_max_to_increase: true,
};

function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'set-1',
    sessionId: 'session-1',
    exerciseId: 'ex-1',
    plannedExerciseId: 'pe-1',
    setNumber: 1,
    targetLoad: 20,
    targetReps: 15,
    targetRir: 2,
    load: 20,
    reps: 15,
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

describe('computeAccessoryLinear', () => {
  describe('cas edge — setLogs vide', () => {
    it('retourne maintain avec next_load null', () => {
      const result = computeAccessoryLinear(BASE_CONFIG, [], []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBeNull();
    });
  });

  describe('haut de fourchette sur toutes les séries', () => {
    it('augmente la charge de increment_kg', () => {
      const sets = [
        makeSet({ setNumber: 1, reps: 15, load: 20 }),
        makeSet({ setNumber: 2, reps: 15, load: 20 }),
        makeSet({ setNumber: 3, reps: 15, load: 20 }),
      ];
      const result = computeAccessoryLinear(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(21.25);
      expect(result.next_rep_target).toBe(10);
    });

    it('augmente si reps > max_reps', () => {
      const sets = [makeSet({ reps: 18, load: 20 })];
      const result = computeAccessoryLinear(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
    });
  });

  describe('progression partielle', () => {
    it('maintient si une série pas au max', () => {
      const sets = [
        makeSet({ setNumber: 1, reps: 15, load: 20 }),
        makeSet({ setNumber: 2, reps: 12, load: 20 }),
      ];
      const result = computeAccessoryLinear(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBe(20);
    });

    it('maintient si reps < max_reps sur toutes les séries', () => {
      const sets = [
        makeSet({ reps: 10, load: 20 }),
        makeSet({ reps: 11, load: 20 }),
      ];
      const result = computeAccessoryLinear(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
    });
  });

  describe('aucune série complétée', () => {
    it('maintient si aucune série completed=true', () => {
      const sets = [makeSet({ completed: false, reps: 15 })];
      const result = computeAccessoryLinear(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
    });
  });

  describe('config incomplète — valeurs par défaut', () => {
    it('utilise les defaults si config vide', () => {
      const partialConfig = {} as AccessoryLinearConfig;
      const sets = [makeSet({ reps: 15, load: 20 })];
      const result = computeAccessoryLinear(partialConfig, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(21.25);
    });
  });
});
