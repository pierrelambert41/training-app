import { computeSessionTonnage, setTonnageKg } from './session-tonnage';
import type { Exercise, SetLog } from '@/types';

function makeSetLog(overrides: Partial<SetLog>): SetLog {
  return {
    id: 's1',
    sessionId: 'sess1',
    exerciseId: 'ex1',
    plannedExerciseId: null,
    setNumber: 1,
    targetLoad: null,
    targetReps: null,
    targetRir: null,
    load: null,
    reps: null,
    rir: null,
    durationSeconds: null,
    distanceMeters: null,
    completed: true,
    side: null,
    notes: null,
    createdAt: '2026-06-11T10:00:00Z',
    updatedAt: '2026-06-11T10:00:00Z',
    ...overrides,
  } as SetLog;
}

function makeExercise(overrides: Partial<Exercise>): Exercise {
  return {
    id: 'ex1',
    name: 'Bench',
    nameFr: null,
    category: 'compound',
    movementPattern: 'horizontal_push',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: ['barbell'],
    logType: 'weight_reps',
    isUnilateral: false,
    systemicFatigue: 'moderate',
    movementStability: 'stable',
    morphoTags: [],
    recommendedProgressionType: null,
    alternatives: [],
    coachingNotes: null,
    tags: [],
    isCustom: false,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  } as Exercise;
}

describe('setTonnageKg', () => {
  it('weight_reps : load × reps', () => {
    expect(
      setTonnageKg(
        { logType: 'weight_reps', load: 100, reps: 5, completed: true, bodyweightFactor: null },
        80
      )
    ).toEqual({ kg: 500, missingBodyweight: false });
  });

  it('set non complété → 0', () => {
    expect(
      setTonnageKg(
        { logType: 'weight_reps', load: 100, reps: 5, completed: false, bodyweightFactor: null },
        80
      ).kg
    ).toBe(0);
  });

  it('bodyweight_reps : (BW × factor + lest) × reps', () => {
    expect(
      setTonnageKg(
        { logType: 'bodyweight_reps', load: 10, reps: 8, completed: true, bodyweightFactor: null },
        80
      )
    ).toEqual({ kg: 720, missingBodyweight: false });
  });

  it('bodyweight_reps avec lest négatif (traction assistée)', () => {
    expect(
      setTonnageKg(
        { logType: 'bodyweight_reps', load: -20, reps: 10, completed: true, bodyweightFactor: null },
        80
      ).kg
    ).toBe(600);
  });

  it('bodyweight_reps avec factor sourcé', () => {
    expect(
      setTonnageKg(
        { logType: 'bodyweight_reps', load: 0, reps: 10, completed: true, bodyweightFactor: 0.64 },
        100
      ).kg
    ).toBe(640);
  });

  it('bodyweight_reps sans pesée → lest seul + flag', () => {
    expect(
      setTonnageKg(
        { logType: 'bodyweight_reps', load: 10, reps: 8, completed: true, bodyweightFactor: null },
        null
      )
    ).toEqual({ kg: 80, missingBodyweight: true });
  });

  it('duration exclu', () => {
    expect(
      setTonnageKg(
        { logType: 'duration', load: null, reps: null, completed: true, bodyweightFactor: null },
        80
      ).kg
    ).toBe(0);
  });
});

describe('computeSessionTonnage', () => {
  it('somme les sets complétés, weight et bodyweight mélangés', () => {
    const bench = makeExercise({ id: 'bench', logType: 'weight_reps' });
    const pullup = makeExercise({ id: 'pullup', logType: 'bodyweight_reps' });
    const exercisesById = new Map([
      ['bench', bench],
      ['pullup', pullup],
    ]);
    const setLogs = [
      makeSetLog({ exerciseId: 'bench', load: 100, reps: 5 }), // 500
      makeSetLog({ exerciseId: 'bench', load: 100, reps: 5, completed: false }), // 0
      makeSetLog({ exerciseId: 'pullup', load: 10, reps: 8 }), // (80+10)*8 = 720
    ];

    expect(computeSessionTonnage(setLogs, exercisesById, 80)).toEqual({
      totalKg: 1220,
      missingBodyweight: false,
    });
  });

  it('flag missingBodyweight si exo bodyweight sans pesée', () => {
    const pullup = makeExercise({ id: 'pullup', logType: 'bodyweight_reps' });
    const result = computeSessionTonnage(
      [makeSetLog({ exerciseId: 'pullup', load: null, reps: 8 })],
      new Map([['pullup', pullup]]),
      null
    );
    expect(result.missingBodyweight).toBe(true);
    expect(result.totalKg).toBe(0);
  });

  it('exercice inconnu → traité en weight_reps', () => {
    const result = computeSessionTonnage(
      [makeSetLog({ exerciseId: 'ghost', load: 50, reps: 10 })],
      new Map(),
      null
    );
    expect(result.totalKg).toBe(500);
  });
});
