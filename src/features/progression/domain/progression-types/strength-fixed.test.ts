import { computeStrengthFixed } from './strength-fixed';
import type { StrengthFixedConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';
import type { ProgressionDecision } from '../../types/progression-decision';

const BASE_CONFIG: StrengthFixedConfig = {
  increment_upper_kg: 1.25,
  increment_lower_kg: 2.5,
  rir_threshold_increase: 2,
  failures_before_reset: 2,
  reset_delta_kg: 2.5,
};

function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'set-1',
    sessionId: 'session-1',
    exerciseId: 'ex-1',
    plannedExerciseId: 'pe-1',
    setNumber: 1,
    targetLoad: 100,
    targetReps: 5,
    targetRir: 2,
    load: 100,
    reps: 5,
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
    next_load: 100,
    next_rep_target: null,
    next_rir_target: null,
    reason: 'test',
  }));
}

describe('computeStrengthFixed', () => {
  describe('cas edge — setLogs vide', () => {
    it('retourne maintain avec next_load null', () => {
      const result = computeStrengthFixed(BASE_CONFIG, [], []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBeNull();
    });
  });

  describe('toutes séries réussies + RIR >= threshold', () => {
    it('augmente la charge de increment_upper_kg', () => {
      const sets = [
        makeSet({ setNumber: 1, load: 100, rir: 2 }),
        makeSet({ setNumber: 2, load: 100, rir: 2 }),
        makeSet({ setNumber: 3, load: 100, rir: 3 }),
      ];
      const result = computeStrengthFixed(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(101.25);
    });

    it('retourne increase avec RIR exactement au threshold', () => {
      const sets = [makeSet({ rir: 2, load: 80 })];
      const result = computeStrengthFixed(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(81.25);
    });
  });

  describe('toutes séries réussies + RIR 0-1', () => {
    it('maintient la charge si RIR = 1', () => {
      const sets = [makeSet({ rir: 1, load: 100, completed: true })];
      const result = computeStrengthFixed(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBe(100);
    });

    it('maintient la charge si RIR = 0', () => {
      const sets = [makeSet({ rir: 0, load: 100, completed: true })];
      const result = computeStrengthFixed(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBe(100);
    });

    it('maintient si RIR null', () => {
      const sets = [makeSet({ rir: null, load: 100, completed: true })];
      const result = computeStrengthFixed(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
    });
  });

  describe('1 série échouée', () => {
    it('maintient si 1 série échouée', () => {
      const sets = [
        makeSet({ setNumber: 1, load: 100, completed: true, rir: 2 }),
        makeSet({ setNumber: 2, load: 100, completed: false, rir: null }),
      ];
      const result = computeStrengthFixed(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBe(100);
    });
  });

  describe('failures_before_reset séances consécutives échouées', () => {
    it('reset la charge quand N-1 decrease en history ET séance courante échouée', () => {
      // failures_before_reset = 2 : 1 decrease en history + 1 échec courant = 2 → reset
      const sets = [makeSet({ setNumber: 1, completed: false, load: 100 })];
      const history = makeHistory(['decrease']);
      const result = computeStrengthFixed(BASE_CONFIG, sets, history);
      expect(result.action).toBe('decrease');
      expect(result.next_load).toBe(97.5);
    });

    it('ne reset pas si N-1 decrease en history mais séance courante réussie', () => {
      // 1 decrease en history mais séance courante = toutes séries réussies → pas de reset
      const sets = [makeSet({ completed: true, load: 100, rir: 1 })];
      const history = makeHistory(['decrease']);
      const result = computeStrengthFixed(BASE_CONFIG, sets, history);
      expect(result.action).toBe('maintain');
    });

    it('ne reset pas si séance courante échouée sans historique de decrease suffisant', () => {
      // 1 échec courant mais 0 decrease en history → seulement 1 sur 2 requis
      const sets = [makeSet({ completed: false, load: 100 })];
      const history = makeHistory(['increase']);
      const result = computeStrengthFixed(BASE_CONFIG, sets, history);
      expect(result.action).toBe('maintain');
    });
  });

  describe('reset load ne passe pas en dessous de 0', () => {
    it('floor à 0 si reset_delta > load actuelle', () => {
      const sets = [makeSet({ load: 2, completed: false })];
      const history = makeHistory(['decrease']);
      const result = computeStrengthFixed(BASE_CONFIG, sets, history);
      expect(result.action).toBe('decrease');
      expect(result.next_load).toBe(0);
    });
  });

  describe('config incomplète — valeurs par défaut', () => {
    it('utilise increment_upper_kg par défaut si manquant', () => {
      const partialConfig = {} as StrengthFixedConfig;
      const sets = [makeSet({ rir: 3, load: 100, completed: true })];
      const result = computeStrengthFixed(partialConfig, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(101.25);
    });
  });
});
