import { computeDurationProgression } from './duration-progression';
import type { DurationProgressionConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';

const BASE_CONFIG: DurationProgressionConfig = {
  increment_seconds: 10,
  target_seconds: 60,
};

function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'set-1',
    sessionId: 'session-1',
    exerciseId: 'ex-1',
    plannedExerciseId: 'pe-1',
    setNumber: 1,
    targetLoad: null,
    targetReps: null,
    targetRir: null,
    load: null,
    reps: null,
    rir: null,
    durationSeconds: 60,
    distanceMeters: null,
    completed: true,
    side: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeDurationProgression', () => {
  describe('cas edge — setLogs vide', () => {
    it('retourne maintain avec next_load null', () => {
      const result = computeDurationProgression(BASE_CONFIG, [], []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBeNull();
    });
  });

  describe('durée cible atteinte', () => {
    it('augmente la durée cible de increment_seconds', () => {
      const sets = [makeSet({ durationSeconds: 60 })];
      const result = computeDurationProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_rep_target).toBe(70);
    });

    it('augmente si durée > target_seconds', () => {
      const sets = [makeSet({ durationSeconds: 75 })];
      const result = computeDurationProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
    });

    it('toutes séries doivent atteindre la cible pour augmenter', () => {
      const sets = [
        makeSet({ setNumber: 1, durationSeconds: 60 }),
        makeSet({ setNumber: 2, durationSeconds: 45 }),
      ];
      const result = computeDurationProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
    });
  });

  describe('durée en dessous de la cible', () => {
    it('maintient si durée < target_seconds', () => {
      const sets = [makeSet({ durationSeconds: 45 })];
      const result = computeDurationProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
      expect(result.next_rep_target).toBe(60);
    });
  });

  describe('aucune série avec durée', () => {
    it('maintient si durationSeconds null', () => {
      const sets = [makeSet({ durationSeconds: null })];
      const result = computeDurationProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
    });
  });

  describe('config incomplète — valeurs par défaut', () => {
    it('utilise les defaults si config vide', () => {
      const partialConfig = {} as DurationProgressionConfig;
      const sets = [makeSet({ durationSeconds: 60 })];
      const result = computeDurationProgression(partialConfig, sets, []);
      expect(result.action).toBe('increase');
    });
  });
});
