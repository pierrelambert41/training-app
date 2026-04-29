import { computeBodyweightProgression } from './bodyweight-progression';
import type { BodyweightProgressionConfig } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';

const BASE_CONFIG: BodyweightProgressionConfig = {
  increment_kg: 2.5,
  min_reps: 5,
  max_reps: 10,
};

function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'set-1',
    sessionId: 'session-1',
    exerciseId: 'ex-1',
    plannedExerciseId: 'pe-1',
    setNumber: 1,
    targetLoad: 0,
    targetReps: 10,
    targetRir: 2,
    load: 0,
    reps: 10,
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

describe('computeBodyweightProgression', () => {
  describe('cas edge — setLogs vide', () => {
    it('retourne maintain avec next_load null', () => {
      const result = computeBodyweightProgression(BASE_CONFIG, [], []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBeNull();
    });
  });

  describe('haut de fourchette atteint — poids de corps pur (load=0)', () => {
    it('ajoute du lest', () => {
      const sets = [
        makeSet({ setNumber: 1, reps: 10, load: 0 }),
        makeSet({ setNumber: 2, reps: 10, load: 0 }),
      ];
      const result = computeBodyweightProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(2.5);
      expect(result.next_rep_target).toBe(5);
    });

    it('augmente le lest si lest déjà présent et max atteint', () => {
      const sets = [
        makeSet({ reps: 10, load: 5 }),
        makeSet({ reps: 10, load: 5 }),
      ];
      const result = computeBodyweightProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('increase');
      expect(result.next_load).toBe(7.5);
    });
  });

  describe('lest ajouté + reps trop basses', () => {
    it('revient au poids de corps si reps < min_reps avec lest', () => {
      const sets = [
        makeSet({ reps: 3, load: 5 }),
        makeSet({ reps: 4, load: 5 }),
      ];
      const result = computeBodyweightProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('decrease');
      expect(result.next_load).toBe(0);
    });

    it('ne revient pas au poids de corps si load=0 et reps trop basses', () => {
      const sets = [makeSet({ reps: 3, load: 0 })];
      const result = computeBodyweightProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
    });
  });

  describe('reps insuffisantes pour augmenter', () => {
    it('maintient si reps entre min et max', () => {
      const sets = [
        makeSet({ reps: 7, load: 0 }),
        makeSet({ reps: 8, load: 0 }),
      ];
      const result = computeBodyweightProgression(BASE_CONFIG, sets, []);
      expect(result.action).toBe('maintain');
      expect(result.next_load).toBe(0);
    });
  });

  describe('config incomplète — valeurs par défaut', () => {
    it('utilise les defaults si config vide', () => {
      const partialConfig = {} as BodyweightProgressionConfig;
      const sets = [makeSet({ reps: 10, load: 0 })];
      const result = computeBodyweightProgression(partialConfig, sets, []);
      expect(result.action).toBe('increase');
    });
  });
});
