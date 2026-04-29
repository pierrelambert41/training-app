import { computeDistanceDuration } from './distance-duration';
import type { DistanceDurationConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';

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
    durationSeconds: null,
    distanceMeters: 1000,
    completed: true,
    side: null,
    notes: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('computeDistanceDuration', () => {
  describe('cas edge — setLogs vide', () => {
    it('retourne maintain', () => {
      const result = computeDistanceDuration({}, [], []);
      expect(result.action).toBe('maintain');
    });
  });

  describe('config vide', () => {
    it('retourne maintain', () => {
      const sets = [makeSet()];
      const result = computeDistanceDuration({}, sets, []);
      expect(result.action).toBe('maintain');
    });
  });

  describe('progression par distance', () => {
    const config: DistanceDurationConfig = { target_distance_meters: 1000 };

    it('augmente la distance si cible atteinte', () => {
      const sets = [makeSet({ distanceMeters: 1000 })];
      const result = computeDistanceDuration(config, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(1100);
    });

    it('augmente si distance > cible', () => {
      const sets = [makeSet({ distanceMeters: 1200 })];
      const result = computeDistanceDuration(config, sets, []);
      expect(result.action).toBe('increase');
    });

    it('maintient si distance < cible', () => {
      const sets = [makeSet({ distanceMeters: 800 })];
      const result = computeDistanceDuration(config, sets, []);
      expect(result.action).toBe('maintain');
    });

    it('maintient si une série sous la cible', () => {
      const sets = [
        makeSet({ setNumber: 1, distanceMeters: 1000 }),
        makeSet({ setNumber: 2, distanceMeters: 800 }),
      ];
      const result = computeDistanceDuration(config, sets, []);
      expect(result.action).toBe('maintain');
    });

    it('maintient si distanceMeters null', () => {
      const sets = [makeSet({ distanceMeters: null })];
      const result = computeDistanceDuration(config, sets, []);
      expect(result.action).toBe('maintain');
    });
  });

  describe('progression par durée (réduction du temps)', () => {
    const config: DistanceDurationConfig = { target_duration_seconds: 300 };

    it('réduit la durée cible si temps cible atteint', () => {
      const sets = [makeSet({ durationSeconds: 280, distanceMeters: null })];
      const result = computeDistanceDuration(config, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_rep_target).toBe(250);
    });

    it('atteint exactement la cible → increase', () => {
      const sets = [makeSet({ durationSeconds: 300, distanceMeters: null })];
      const result = computeDistanceDuration(config, sets, []);
      expect(result.action).toBe('increase');
    });

    it('maintient si temps > cible', () => {
      const sets = [makeSet({ durationSeconds: 350, distanceMeters: null })];
      const result = computeDistanceDuration(config, sets, []);
      expect(result.action).toBe('maintain');
    });

    it('next_rep_target ne passe pas en dessous de 0', () => {
      const config2: DistanceDurationConfig = { target_duration_seconds: 20 };
      const sets = [makeSet({ durationSeconds: 15, distanceMeters: null })];
      const result = computeDistanceDuration(config2, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_rep_target).toBeGreaterThanOrEqual(0);
    });
  });

  describe('priorité distance sur durée', () => {
    it('utilise la distance si les deux sont définis', () => {
      const config: DistanceDurationConfig = {
        target_distance_meters: 1000,
        target_duration_seconds: 300,
      };
      const sets = [makeSet({ distanceMeters: 1000, durationSeconds: 280 })];
      const result = computeDistanceDuration(config, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(1100);
    });
  });
});
