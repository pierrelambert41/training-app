import { computeFatigueScore } from './fatigue-score';
import type { FatigueInputs, RecoveryLogSnapshot, CardioSessionSnapshot } from './fatigue-score';
import type { SetLog } from '@/types/set-log';

function makeSetLog(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'set-1',
    sessionId: 'session-1',
    exerciseId: 'ex-1',
    plannedExerciseId: null,
    setNumber: 1,
    targetLoad: null,
    targetReps: null,
    targetRir: null,
    load: 100,
    reps: 5,
    rir: 3,
    durationSeconds: null,
    distanceMeters: null,
    completed: true,
    side: null,
    notes: null,
    createdAt: '2026-04-29T10:00:00Z',
    updatedAt: '2026-04-29T10:00:00Z',
    ...overrides,
  };
}

describe('computeFatigueScore', () => {
  describe('cas données manquantes', () => {
    it('retourne score 0 et level fresh si aucune donnée', () => {
      const result = computeFatigueScore({});
      expect(result.score).toBe(0);
      expect(result.level).toBe('fresh');
    });

    it('retourne score 0 si tous les tableaux sont vides', () => {
      const result = computeFatigueScore({
        recentSetLogs: [],
        recoveryLogs: [],
        recentSessionDates: [],
        plannedSessionDates: [],
        cardioSessions: [],
      });
      expect(result.score).toBe(0);
      expect(result.level).toBe('fresh');
    });

    it('ignore les SetLogs sans load ou reps pour le calcul e1RM', () => {
      const inputs: FatigueInputs = {
        recentSetLogs: [
          [makeSetLog({ load: null, reps: null })],
          [makeSetLog({ load: null, reps: null })],
        ],
      };
      const result = computeFatigueScore(inputs);
      expect(result.score).toBe(0);
      expect(result.level).toBe('fresh');
    });
  });

  describe('cas fraîcheur (0-3)', () => {
    it('retourne fresh si performance stable et RIR élevé', () => {
      const inputs: FatigueInputs = {
        recentSetLogs: [
          [makeSetLog({ load: 100, reps: 5, rir: 3, completed: true })],
          [makeSetLog({ load: 102.5, reps: 5, rir: 3, completed: true })],
        ],
        preSessionReadiness: {
          readiness: 8,
          energy: 8,
          motivation: 9,
          sleepQuality: 8,
        },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 8, energy: 8, soreness: 2 },
          { date: '2026-04-27', sleepHours: 7.5, energy: 7, soreness: 1 },
        ],
      };
      const result = computeFatigueScore(inputs);
      expect(result.score).toBeLessThanOrEqual(3);
      expect(result.level).toBe('fresh');
    });

    it('retourne fresh si assiduité excellente et bonne récupération', () => {
      const inputs: FatigueInputs = {
        recentSessionDates: [
          '2026-04-15', '2026-04-17', '2026-04-20', '2026-04-22',
          '2026-04-24', '2026-04-27',
        ],
        plannedSessionDates: [
          '2026-04-15', '2026-04-17', '2026-04-20', '2026-04-22',
          '2026-04-24', '2026-04-27',
        ],
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 8, energy: 8, soreness: 1 },
        ],
        preSessionReadiness: {
          readiness: 9,
          energy: 9,
          motivation: 9,
          sleepQuality: 9,
        },
      };
      const result = computeFatigueScore(inputs);
      expect(result.score).toBeLessThanOrEqual(3);
      expect(result.level).toBe('fresh');
    });
  });

  describe('cas fatigue modérée (4-6)', () => {
    it('retourne watchful si readiness très faible combinée avec mauvaise récupération', () => {
      const inputs: FatigueInputs = {
        preSessionReadiness: {
          readiness: 1,
          energy: 2,
          motivation: 2,
          sleepQuality: 3,
        },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 5, energy: 3, soreness: 7 },
          { date: '2026-04-27', sleepHours: 5.5, energy: 3, soreness: 6 },
        ],
        recentSetLogs: [
          [makeSetLog({ rir: 1, completed: true }), makeSetLog({ rir: 0, completed: true })],
          [makeSetLog({ rir: 0, completed: true }), makeSetLog({ rir: 1, completed: true })],
        ],
      };
      const result = computeFatigueScore(inputs);
      expect(result.score).toBeGreaterThanOrEqual(4);
      expect(result.score).toBeLessThanOrEqual(8);
      expect(['watchful', 'fatigued']).toContain(result.level);
    });

    it('retourne watchful si RIR systématiquement bas sur 2 séances', () => {
      const inputs: FatigueInputs = {
        recentSetLogs: [
          [
            makeSetLog({ rir: 0, completed: true }),
            makeSetLog({ rir: 1, completed: true }),
            makeSetLog({ rir: 0, completed: true }),
          ],
          [
            makeSetLog({ rir: 1, completed: true }),
            makeSetLog({ rir: 0, completed: true }),
            makeSetLog({ rir: 1, completed: true }),
          ],
        ],
      };
      const result = computeFatigueScore(inputs);
      expect(result.score).toBeGreaterThan(3);
    });

    it('retourne watchful si performance en baisse une fois', () => {
      const inputs: FatigueInputs = {
        recentSetLogs: [
          [makeSetLog({ load: 110, reps: 5 })],
          [makeSetLog({ load: 100, reps: 5 })],
        ],
      };
      const result = computeFatigueScore(inputs);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('cas deload recommandé (9-10)', () => {
    it('retourne deload si tous les indicateurs pointent vers épuisement', () => {
      const inputs: FatigueInputs = {
        recentSetLogs: [
          [
            makeSetLog({ load: 120, reps: 5, rir: 0 }),
            makeSetLog({ load: 120, reps: 4, rir: 0, completed: false }),
          ],
          [
            makeSetLog({ load: 115, reps: 4, rir: 0 }),
            makeSetLog({ load: 115, reps: 3, rir: 0, completed: false }),
          ],
        ],
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 4.5, energy: 2, soreness: 9 },
          { date: '2026-04-27', sleepHours: 5, energy: 2, soreness: 8 },
          { date: '2026-04-26', sleepHours: 4, energy: 1, soreness: 9 },
        ],
        preSessionReadiness: {
          readiness: 1,
          energy: 1,
          motivation: 1,
          sleepQuality: 2,
        },
        cardioSessions: [
          { date: '2026-04-28', rpe: 9, legImpact: 9, fatiguePost: 9 },
        ],
        recentSessionDates: ['2026-04-15', '2026-04-20'],
        plannedSessionDates: [
          '2026-04-15', '2026-04-17', '2026-04-19', '2026-04-22',
          '2026-04-24', '2026-04-27',
        ],
      };
      const result = computeFatigueScore(inputs);
      expect(result.score).toBeGreaterThanOrEqual(9);
      expect(result.level).toBe('deload');
    });
  });

  describe('dégradation gracieuse', () => {
    it('calcule correctement avec seulement preSessionReadiness', () => {
      const inputs: FatigueInputs = {
        preSessionReadiness: {
          readiness: 2,
          energy: 2,
          motivation: null,
          sleepQuality: null,
        },
      };
      const result = computeFatigueScore(inputs);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it('calcule correctement avec seulement recoveryLogs', () => {
      const logs: RecoveryLogSnapshot[] = [
        { date: '2026-04-28', sleepHours: 4, energy: 2, soreness: 8 },
        { date: '2026-04-27', sleepHours: 5, energy: 3, soreness: 7 },
      ];
      const result = computeFatigueScore({ recoveryLogs: logs });
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it('calcule correctement avec seulement cardioSessions', () => {
      const cardio: CardioSessionSnapshot[] = [
        { date: '2026-04-28', rpe: 9, legImpact: 8, fatiguePost: 9 },
      ];
      const result = computeFatigueScore({ cardioSessions: cardio });
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it('calcule correctement avec seulement 1 séance de SetLogs (pas de comparaison e1RM)', () => {
      const inputs: FatigueInputs = {
        recentSetLogs: [
          [makeSetLog({ rir: 0 }), makeSetLog({ rir: 0 }), makeSetLog({ rir: 0 })],
        ],
      };
      const result = computeFatigueScore(inputs);
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });

    it('retourne un score dans [0, 10] peu importe les inputs extrêmes', () => {
      const extremeInputs: FatigueInputs = {
        recentSetLogs: [
          [makeSetLog({ load: 999, reps: 1, rir: 0, completed: false })],
          [makeSetLog({ load: 1, reps: 1, rir: 0, completed: false })],
        ],
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 0, energy: 0, soreness: 10 },
        ],
        preSessionReadiness: {
          readiness: 1,
          energy: 1,
          motivation: 1,
          sleepQuality: 1,
        },
        recentSessionDates: [],
        plannedSessionDates: ['2026-04-15', '2026-04-17', '2026-04-19'],
        cardioSessions: [
          { date: '2026-04-28', rpe: 10, legImpact: 10, fatiguePost: 10 },
        ],
      };
      const result = computeFatigueScore(extremeInputs);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(10);
    });
  });

  describe('calcul e1RM Epley', () => {
    it('détecte une baisse de performance via e1RM', () => {
      const inputs: FatigueInputs = {
        recentSetLogs: [
          [makeSetLog({ load: 100, reps: 5 })],
          [makeSetLog({ load: 80, reps: 3 })],
        ],
      };
      const result = computeFatigueScore(inputs);
      // e1RM session 1 = 100 * (1 + 5/30) ≈ 116.7
      // e1RM session 2 = 80 * (1 + 3/30) ≈ 88
      // Baisse → contribue au score
      expect(result.score).toBeGreaterThan(0);
    });

    it('ne détecte pas de baisse si e1RM stable ou en hausse', () => {
      const inputs: FatigueInputs = {
        recentSetLogs: [
          [makeSetLog({ load: 100, reps: 5 })],
          [makeSetLog({ load: 105, reps: 5 })],
        ],
        preSessionReadiness: {
          readiness: 9,
          energy: 9,
          motivation: 9,
          sleepQuality: 9,
        },
      };
      const result = computeFatigueScore(inputs);
      expect(result.level).toBe('fresh');
    });
  });

  describe('paliers de fatigue', () => {
    it('score 0 → fresh', () => {
      expect(computeFatigueScore({}).level).toBe('fresh');
    });

    it('preSessionReadiness basse → watchful ou plus', () => {
      const inputs: FatigueInputs = {
        preSessionReadiness: { readiness: 2, energy: 2, motivation: 2, sleepQuality: 3 },
      };
      const result = computeFatigueScore(inputs);
      expect(['watchful', 'fatigued', 'deload']).toContain(result.level);
    });
  });
});
