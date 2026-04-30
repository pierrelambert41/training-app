import { computeNextSessionPlan } from './session-plan';
import type { SessionPlanInputs, SessionStatus } from './session-plan';
import type { PlannedExercise } from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';
import type { ProgressionDecision } from '../types/progression-decision';

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function makePlannedExercise(overrides: Partial<PlannedExercise> = {}): PlannedExercise {
  return {
    id: 'pe-1',
    workoutDayId: 'wd-1',
    exerciseId: 'ex-1',
    exerciseOrder: 1,
    role: 'main',
    sets: 4,
    repRangeMin: 6,
    repRangeMax: 8,
    targetRir: 2,
    restSeconds: 120,
    tempo: null,
    progressionType: 'double_progression',
    progressionConfig: {
      increment_kg: 2.5,
      min_reps: 6,
      max_reps: 8,
      all_sets_at_max_to_increase: true,
      regressions_before_alert: 2,
    },
    notes: null,
    isUnplanned: false,
    createdAt: '2026-04-01T00:00:00Z',
    ...overrides,
  };
}

function makeSetLog(overrides: Partial<SetLog> = {}): SetLog {
  return {
    id: 'set-1',
    sessionId: 'session-1',
    exerciseId: 'ex-1',
    plannedExerciseId: 'pe-1',
    setNumber: 1,
    targetLoad: 80,
    targetReps: 8,
    targetRir: 2,
    load: 80,
    reps: 8,
    rir: 2,
    durationSeconds: null,
    distanceMeters: null,
    completed: true,
    side: null,
    notes: null,
    createdAt: '2026-04-28T10:00:00Z',
    updatedAt: '2026-04-28T10:00:00Z',
    ...overrides,
  };
}

function makeIncreaseDecision(load = 80): ProgressionDecision {
  return {
    action: 'increase',
    next_load: load,
    next_rep_target: 6,
    next_rir_target: null,
    reason: 'Toutes séries au max — charge augmentée.',
  };
}

/** Config strength_fixed réutilisable dans plusieurs tests. */
const STRENGTH_FIXED_CONFIG = {
  progressionType: 'strength_fixed' as const,
  progressionConfig: {
    increment_upper_kg: 1.25,
    increment_lower_kg: 2.5,
    rir_threshold_increase: 2,
    failures_before_reset: 2,
    reset_delta_kg: 2.5,
  },
};

const BASE_TODAY = '2026-04-29T10:00:00Z';

// ---------------------------------------------------------------------------
// Statut : progression
// ---------------------------------------------------------------------------

describe('computeNextSessionPlan — statut progression', () => {
  it('retourne progression si fatigue 0-3 et aucun signal contraire', () => {
    const exercise = makePlannedExercise();
    const setLogs = [
      makeSetLog({ reps: 8, rir: 3, completed: true }),
      makeSetLog({ id: 'set-2', reps: 8, rir: 3, completed: true }),
    ];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        preSessionReadiness: { readiness: 9, energy: 9, motivation: 9, sleepQuality: 9 },
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('progression');
    expect(result.fatigueScore.score).toBeLessThanOrEqual(3);
    expect(result.exercisePlans).toHaveLength(1);
  });

  it('retourne un ExercisePlan par PlannedExercise', () => {
    const exercises = [
      makePlannedExercise({ id: 'pe-1', exerciseId: 'ex-1' }),
      makePlannedExercise({ id: 'pe-2', exerciseId: 'ex-2', exerciseOrder: 2 }),
    ];

    const inputs: SessionPlanInputs = {
      plannedExercises: exercises,
      setLogsByExercise: {},
      progressionHistoryByExercise: {},
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.exercisePlans).toHaveLength(2);
    expect(result.exercisePlans.map((p) => p.plannedExerciseId)).toEqual(['pe-1', 'pe-2']);
  });
});

// ---------------------------------------------------------------------------
// Statut : maintien
// ---------------------------------------------------------------------------

describe('computeNextSessionPlan — statut maintien', () => {
  /**
   * Score calculé manuellement :
   * - performanceDecline : e1RM stable (load=80, reps=8 sur les deux séances) → 0, poids=3
   * - lowRir : 4 sets RIR 0-1 sur 4 → 1.0, poids=3
   * - recoverySleepEnergy : sleepHours=5 (<6h) + energy=3 (<4) → 1/1 = 1.0, poids=2
   * - recoverySoreness : soreness=7 (pas > 7) → 0/1 = 0, poids=2
   * - preSessionReadiness : avg=(2+2+2+3)/4=2.25 → 1-(2.25-1)/3≈0.583, poids=2
   * totalWeight=12, weightedSum=0*3+1*3+1*2+0*2+0.583*2≈6.167
   * score=(6.167/12)*10≈5.1 → maintien (4-6)
   */
  it('retourne maintien si fatigue ~5 (score calculé déterministement)', () => {
    const exercise = makePlannedExercise();

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': [] },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        preSessionReadiness: { readiness: 2, energy: 2, motivation: 2, sleepQuality: 3 },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 5, energy: 3, soreness: 7 },
        ],
        recentSetLogs: [
          [makeSetLog({ rir: 0, completed: true }), makeSetLog({ id: 'set-2', rir: 1, completed: true })],
          [makeSetLog({ id: 'set-3', rir: 0, completed: true }), makeSetLog({ id: 'set-4', rir: 1, completed: true })],
        ],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('maintien');
    expect(result.fatigueScore.score).toBeGreaterThanOrEqual(4);
    expect(result.fatigueScore.score).toBeLessThanOrEqual(6);
  });
});

// ---------------------------------------------------------------------------
// Statut : allegee
// ---------------------------------------------------------------------------

describe('computeNextSessionPlan — statut allegee', () => {
  /**
   * Ce test vérifie que le statut "allegee" est produit pour un score 7-8.
   * Les données de recentSetLogs du recoveryContext ciblent intentionnellement
   * fatigue 7-8 (pas 9-10) : une baisse de perf + RIR bas, mais pas cardio extrême.
   */
  it('retourne allegee si fatigue 7-8 et applique -10% sur la charge', () => {
    const exercise = makePlannedExercise(STRENGTH_FIXED_CONFIG);

    // SetLogs de la séance courante (pour la décision de progression)
    const setLogs = [
      makeSetLog({ load: 100, reps: 5, rir: 3, completed: true }),
      makeSetLog({ id: 'set-2', load: 100, reps: 5, rir: 3, completed: true }),
    ];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        preSessionReadiness: { readiness: 1, energy: 1, motivation: 1, sleepQuality: 2 },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 4.5, energy: 2, soreness: 8 },
          { date: '2026-04-27', sleepHours: 4.5, energy: 2, soreness: 8 },
        ],
        // RIR 0-1 systématique sur 2 séances (poids Fort = 3) sans baisse e1RM massive
        recentSetLogs: [
          [
            makeSetLog({ load: 100, reps: 5, rir: 0 }),
            makeSetLog({ id: 'set-a2', load: 100, reps: 5, rir: 1 }),
          ],
          [
            makeSetLog({ id: 'set-b1', load: 100, reps: 5, rir: 0 }),
            makeSetLog({ id: 'set-b2', load: 100, reps: 5, rir: 1 }),
          ],
        ],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);

    // Le score doit être dans la zone 7-8 → allegee
    expect(result.fatigueScore.score).toBeGreaterThanOrEqual(7);
    expect(result.fatigueScore.score).toBeLessThanOrEqual(8);
    expect(result.status).toBe('allegee');

    // La charge de base strength_fixed avec RIR=3 ≥ 2 → increase : 100 + 1.25 = 101.25
    // Allegee applique *0.9 → 91.125, arrondi au 0.25 proche → 91.25
    const plan = result.exercisePlans[0]!;
    expect(plan.next_load).not.toBeNull();
    if (plan.next_load !== null) {
      expect(plan.next_load).toBeLessThan(101.25);
    }
  });

  it('reduit les series de 1 en statut allegee (spec §3.3 : -1 serie)', () => {
    // PlannedExercise.sets = 4 → allegee doit retourner next_sets = 3
    const exercise = makePlannedExercise({ ...STRENGTH_FIXED_CONFIG, sets: 4 });

    const setLogs = [
      makeSetLog({ load: 100, reps: 5, rir: 3, completed: true }),
    ];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        preSessionReadiness: { readiness: 1, energy: 1, motivation: 1, sleepQuality: 2 },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 4.5, energy: 2, soreness: 8 },
          { date: '2026-04-27', sleepHours: 4.5, energy: 2, soreness: 8 },
        ],
        recentSetLogs: [
          [makeSetLog({ load: 100, reps: 5, rir: 0 }), makeSetLog({ id: 'set-a2', load: 100, reps: 5, rir: 1 })],
          [makeSetLog({ id: 'set-b1', load: 100, reps: 5, rir: 0 }), makeSetLog({ id: 'set-b2', load: 100, reps: 5, rir: 1 })],
        ],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('allegee');
    const plan = result.exercisePlans[0]!;
    expect(plan.next_sets).toBe(3);
  });

  it('arrondit la charge allegee au 0.25 kg le plus proche', () => {
    const exercise = makePlannedExercise(STRENGTH_FIXED_CONFIG);

    // Charge de base : 80 kg (maintien, RIR=1 < 2) → allegee : 80 * 0.9 = 72.0
    const setLogs = [makeSetLog({ load: 80, reps: 5, rir: 1, completed: true })];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        preSessionReadiness: { readiness: 1, energy: 1, motivation: 1, sleepQuality: 2 },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 4.5, energy: 2, soreness: 8 },
          { date: '2026-04-27', sleepHours: 4.5, energy: 2, soreness: 8 },
        ],
        recentSetLogs: [
          [makeSetLog({ load: 80, reps: 5, rir: 0 }), makeSetLog({ id: 'set-2', load: 80, reps: 5, rir: 1 })],
          [makeSetLog({ id: 'set-3', load: 80, reps: 5, rir: 0 }), makeSetLog({ id: 'set-4', load: 80, reps: 5, rir: 1 })],
        ],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('allegee');
    const plan = result.exercisePlans[0]!;
    expect(plan.next_load).not.toBeNull();
    if (plan.next_load !== null) {
      expect(plan.next_load % 0.25).toBeCloseTo(0, 5);
    }
  });
});

// ---------------------------------------------------------------------------
// Statut : deload
// ---------------------------------------------------------------------------

describe('computeNextSessionPlan — statut deload', () => {
  it('retourne deload si fatigue >= 9', () => {
    const exercise = makePlannedExercise(STRENGTH_FIXED_CONFIG);

    const setLogs = [makeSetLog({ load: 100, reps: 5, rir: 3, completed: true })];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        preSessionReadiness: { readiness: 1, energy: 1, motivation: 1, sleepQuality: 1 },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 4, energy: 1, soreness: 9 },
          { date: '2026-04-27', sleepHours: 4.5, energy: 1, soreness: 9 },
          { date: '2026-04-26', sleepHours: 4, energy: 1, soreness: 10 },
        ],
        recentSetLogs: [
          [
            makeSetLog({ load: 120, reps: 5, rir: 0 }),
            makeSetLog({ id: 'set-a2', load: 120, reps: 3, rir: 0, completed: false }),
          ],
          [
            makeSetLog({ id: 'set-b1', load: 115, reps: 4, rir: 0 }),
            makeSetLog({ id: 'set-b2', load: 115, reps: 2, rir: 0, completed: false }),
          ],
        ],
        cardioSessions: [
          { date: '2026-04-28', rpe: 9, legImpact: 9, fatiguePost: 10 },
        ],
        recentSessionDates: ['2026-04-10', '2026-04-15'],
        plannedSessionDates: [
          '2026-04-10', '2026-04-12', '2026-04-15', '2026-04-17', '2026-04-20', '2026-04-22',
        ],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('deload');
    expect(result.fatigueScore.score).toBeGreaterThanOrEqual(9);

    // Deload : charge réduite de 30-40%, RIR cible = 4
    const plan = result.exercisePlans[0]!;
    expect(plan.next_rir_target).toBe(4);
    expect(plan.next_load).not.toBeNull();
    if (plan.next_load !== null) {
      // Base decision augmente à 101.25 → deload = 101.25 * 0.65 ≈ 65.8
      expect(plan.next_load).toBeLessThan(80);
    }
  });

  it('retourne deload (pas prudente) si longue pause ET fatigue >= 9 — deload prime sur prudente', () => {
    const exercise = makePlannedExercise(STRENGTH_FIXED_CONFIG);

    const setLogs = [makeSetLog({ load: 100, reps: 5, rir: 3, completed: true })];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        // Longue pause : dernière séance il y a 28 jours
        recentCompletedSessions: [{ endedAt: '2026-04-01T10:00:00Z' }],
        // Fatigue >= 9
        preSessionReadiness: { readiness: 1, energy: 1, motivation: 1, sleepQuality: 1 },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 4, energy: 1, soreness: 9 },
          { date: '2026-04-27', sleepHours: 4.5, energy: 1, soreness: 9 },
          { date: '2026-04-26', sleepHours: 4, energy: 1, soreness: 10 },
        ],
        recentSetLogs: [
          [
            makeSetLog({ load: 120, reps: 5, rir: 0 }),
            makeSetLog({ id: 'set-a2', load: 120, reps: 3, rir: 0, completed: false }),
          ],
          [
            makeSetLog({ id: 'set-b1', load: 115, reps: 4, rir: 0 }),
            makeSetLog({ id: 'set-b2', load: 115, reps: 2, rir: 0, completed: false }),
          ],
        ],
        cardioSessions: [
          { date: '2026-04-28', rpe: 9, legImpact: 9, fatiguePost: 10 },
        ],
        recentSessionDates: ['2026-04-10', '2026-04-15'],
        plannedSessionDates: [
          '2026-04-10', '2026-04-12', '2026-04-15', '2026-04-17', '2026-04-20', '2026-04-22',
        ],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.fatigueScore.score).toBeGreaterThanOrEqual(9);
    // deload prime sur prudente même si longue pause détectée
    expect(result.status).toBe('deload');
    expect(result.status).not.toBe('prudente');
  });

  it('fixe le rep_target au min de la fourchette lors du deload', () => {
    const exercise = makePlannedExercise({ repRangeMin: 8 });
    const setLogs = [makeSetLog({ load: 60, reps: 8, rir: 2, completed: true })];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        preSessionReadiness: { readiness: 1, energy: 1, motivation: 1, sleepQuality: 1 },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 4, energy: 1, soreness: 9 },
          { date: '2026-04-27', sleepHours: 4.5, energy: 1, soreness: 9 },
          { date: '2026-04-26', sleepHours: 4, energy: 1, soreness: 10 },
        ],
        recentSetLogs: [
          [
            makeSetLog({ load: 120, reps: 5, rir: 0 }),
            makeSetLog({ id: 'set-a2', load: 120, reps: 3, rir: 0, completed: false }),
          ],
          [
            makeSetLog({ id: 'set-b1', load: 115, reps: 4, rir: 0 }),
            makeSetLog({ id: 'set-b2', load: 115, reps: 2, rir: 0, completed: false }),
          ],
        ],
        cardioSessions: [{ date: '2026-04-28', rpe: 9, legImpact: 9, fatiguePost: 10 }],
        recentSessionDates: ['2026-04-10', '2026-04-15'],
        plannedSessionDates: [
          '2026-04-10', '2026-04-12', '2026-04-15', '2026-04-17', '2026-04-20', '2026-04-22',
        ],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('deload');
    const plan = result.exercisePlans[0]!;
    expect(plan.next_rep_target).toBe(8);
    expect(plan.next_rir_target).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// Statut : prudente (longue pause > 14j)
// ---------------------------------------------------------------------------

describe('computeNextSessionPlan — statut prudente', () => {
  it('retourne prudente si la dernière séance date de plus de 14 jours', () => {
    const exercise = makePlannedExercise(STRENGTH_FIXED_CONFIG);

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: {},
      progressionHistoryByExercise: {},
      recoveryContext: {
        recentCompletedSessions: [
          { endedAt: '2026-04-01T10:00:00Z' }, // 28 jours avant le 29 avril
        ],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('prudente');
  });

  it('applique -20% sur la charge de base si statut prudente', () => {
    const exercise = makePlannedExercise(STRENGTH_FIXED_CONFIG);

    // Charge de base = 100 (maintien car RIR=1 < rir_threshold_increase=2)
    const setLogs = [makeSetLog({ load: 100, reps: 5, rir: 1, completed: true })];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        recentCompletedSessions: [{ endedAt: '2026-04-01T10:00:00Z' }],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('prudente');
    const plan = result.exercisePlans[0]!;
    expect(plan.next_load).not.toBeNull();
    if (plan.next_load !== null) {
      // 100 * 0.8 = 80 (arrondi au 0.25)
      expect(plan.next_load).toBeCloseTo(80, 0);
    }
  });

  it('ne retourne pas prudente si dernière séance < 14 jours', () => {
    const exercise = makePlannedExercise();
    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: {},
      progressionHistoryByExercise: {},
      recoveryContext: {
        recentCompletedSessions: [
          { endedAt: '2026-04-25T10:00:00Z' }, // 4 jours avant
        ],
        preSessionReadiness: { readiness: 9, energy: 9, motivation: 9, sleepQuality: 9 },
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).not.toBe('prudente');
  });
});

// ---------------------------------------------------------------------------
// Statut : aggressive
// ---------------------------------------------------------------------------

describe('computeNextSessionPlan — statut aggressive', () => {
  it('retourne aggressive si fatigue 0-1 et 3+ séances consécutives en progression', () => {
    const exercise = makePlannedExercise();

    const history: ProgressionDecision[] = [
      makeIncreaseDecision(70),
      makeIncreaseDecision(72.5),
      makeIncreaseDecision(75),
    ];

    const setLogs = [
      makeSetLog({ load: 75, reps: 8, rir: 3, completed: true }),
      makeSetLog({ id: 'set-2', load: 75, reps: 8, rir: 3, completed: true }),
    ];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': history },
      recoveryContext: {
        preSessionReadiness: { readiness: 9, energy: 10, motivation: 10, sleepQuality: 9 },
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.fatigueScore.score).toBeLessThanOrEqual(1);
    expect(result.status).toBe('aggressive');
  });

  it("ne retourne pas aggressive si un exercice sur deux n'a pas 3 progressions consecutives", () => {
    // ex-1 : 3 increase consécutives
    const exercise1 = makePlannedExercise({ id: 'pe-1', exerciseId: 'ex-1' });
    // ex-2 : seulement 1 increase → min = 1 → bloque aggressive
    const exercise2 = makePlannedExercise({ id: 'pe-2', exerciseId: 'ex-2', exerciseOrder: 2 });

    const historyEx1: ProgressionDecision[] = [
      makeIncreaseDecision(70),
      makeIncreaseDecision(72.5),
      makeIncreaseDecision(75),
    ];
    const historyEx2: ProgressionDecision[] = [
      makeIncreaseDecision(60),
    ];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise1, exercise2],
      setLogsByExercise: {},
      progressionHistoryByExercise: {
        'pe-1': historyEx1,
        'pe-2': historyEx2,
      },
      recoveryContext: {
        preSessionReadiness: { readiness: 9, energy: 10, motivation: 10, sleepQuality: 9 },
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.fatigueScore.score).toBeLessThanOrEqual(1);
    // countConsecutiveProgressions retourne min(3, 1) = 1 → pas aggressive
    expect(result.status).not.toBe('aggressive');
  });

  it('ne retourne pas aggressive si seulement 2 séances en progression', () => {
    const exercise = makePlannedExercise();

    const history: ProgressionDecision[] = [
      makeIncreaseDecision(70),
      makeIncreaseDecision(72.5),
    ];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': [] },
      progressionHistoryByExercise: { 'pe-1': history },
      recoveryContext: {
        preSessionReadiness: { readiness: 9, energy: 10, motivation: 10, sleepQuality: 9 },
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).not.toBe('aggressive');
  });

  it('ne retourne pas aggressive si fatigue > 1', () => {
    const exercise = makePlannedExercise();

    const history: ProgressionDecision[] = [
      makeIncreaseDecision(70),
      makeIncreaseDecision(72.5),
      makeIncreaseDecision(75),
    ];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': [] },
      progressionHistoryByExercise: { 'pe-1': history },
      recoveryContext: {
        preSessionReadiness: { readiness: 1, energy: 2, motivation: 2, sleepQuality: 3 },
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).not.toBe('aggressive');
  });
});

// ---------------------------------------------------------------------------
// Cas limites
// ---------------------------------------------------------------------------

describe('computeNextSessionPlan — cas limites', () => {
  it('fonctionne avec 0 exercice dans le WorkoutDay', () => {
    const inputs: SessionPlanInputs = {
      plannedExercises: [],
      setLogsByExercise: {},
      progressionHistoryByExercise: {},
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.exercisePlans).toHaveLength(0);
    expect(result.status).toBe('progression');
  });

  it('fonctionne avec 0 historique (première séance)', () => {
    const exercise = makePlannedExercise();

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: {},
      progressionHistoryByExercise: {},
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.exercisePlans).toHaveLength(1);
    const plan = result.exercisePlans[0]!;
    expect(plan.plannedExerciseId).toBe('pe-1');
    // Sans setLogs, la décision est 'maintain'
    expect(plan.decision).toBe('maintain');
  });

  it('fonctionne si recoveryContext est absent (dégradation gracieuse)', () => {
    const exercise = makePlannedExercise();

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: {},
      progressionHistoryByExercise: {},
      today: BASE_TODAY,
      // recoveryContext absent intentionnellement
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.fatigueScore.score).toBe(0);
    expect(result.status).toBe('progression');
  });

  it('fonctionne si recentCompletedSessions est vide (pas de longue pause)', () => {
    const exercise = makePlannedExercise();

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: {},
      progressionHistoryByExercise: {},
      recoveryContext: {
        recentCompletedSessions: [],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).not.toBe('prudente');
  });

  it('la longue pause prime sur la fatigue basse', () => {
    const exercise = makePlannedExercise();

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: {},
      progressionHistoryByExercise: {},
      recoveryContext: {
        recentCompletedSessions: [{ endedAt: '2026-03-01T10:00:00Z' }],
        preSessionReadiness: { readiness: 10, energy: 10, motivation: 10, sleepQuality: 10 },
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('prudente');
  });

  it('preserve la décision logique (action) même lors du deload', () => {
    const exercise = makePlannedExercise(STRENGTH_FIXED_CONFIG);

    const setLogs = [makeSetLog({ load: 100, reps: 5, rir: 3, completed: true })];

    const inputs: SessionPlanInputs = {
      plannedExercises: [exercise],
      setLogsByExercise: { 'pe-1': setLogs },
      progressionHistoryByExercise: { 'pe-1': [] },
      recoveryContext: {
        preSessionReadiness: { readiness: 1, energy: 1, motivation: 1, sleepQuality: 1 },
        recoveryLogs: [
          { date: '2026-04-28', sleepHours: 4, energy: 1, soreness: 9 },
          { date: '2026-04-27', sleepHours: 4.5, energy: 1, soreness: 9 },
          { date: '2026-04-26', sleepHours: 4, energy: 1, soreness: 10 },
        ],
        recentSetLogs: [
          [
            makeSetLog({ load: 120, reps: 5, rir: 0 }),
            makeSetLog({ id: 'set-a2', load: 120, reps: 3, rir: 0, completed: false }),
          ],
          [
            makeSetLog({ id: 'set-b1', load: 115, reps: 4, rir: 0 }),
            makeSetLog({ id: 'set-b2', load: 115, reps: 2, rir: 0, completed: false }),
          ],
        ],
        cardioSessions: [{ date: '2026-04-28', rpe: 9, legImpact: 9, fatiguePost: 10 }],
        recentSessionDates: ['2026-04-10', '2026-04-15'],
        plannedSessionDates: [
          '2026-04-10', '2026-04-12', '2026-04-15', '2026-04-17', '2026-04-20', '2026-04-22',
        ],
      },
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(result.status).toBe('deload');
    const plan = result.exercisePlans[0]!;
    // La décision de base strength_fixed avec RIR=3 ≥ 2 = 'increase'
    expect(plan.decision).toBe('increase');
  });

  it('retourne un status valide parmi les 6 valeurs possibles', () => {
    const validStatuses: SessionStatus[] = [
      'progression', 'maintien', 'allegee', 'prudente', 'aggressive', 'deload',
    ];

    const inputs: SessionPlanInputs = {
      plannedExercises: [],
      setLogsByExercise: {},
      progressionHistoryByExercise: {},
      today: BASE_TODAY,
    };

    const result = computeNextSessionPlan(inputs);
    expect(validStatuses).toContain(result.status);
  });
});
