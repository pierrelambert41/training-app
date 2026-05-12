import type { SQLiteDatabase } from 'expo-sqlite';
import { calibrateExerciseBaselines } from './calibration-service';

type MockDb = SQLiteDatabase & {
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
};

type SetLogRow = {
  exercise_id: string;
  load: number;
  reps: number;
  session_date: string;
};

type PlannedExerciseRow = {
  id: string;
  exercise_id: string;
  progression_config: string;
};

function makeMockDb(opts?: {
  setLogRows?: SetLogRow[];
  activeProgramId?: string | null;
  plannedExerciseRows?: PlannedExerciseRow[];
}): MockDb {
  const setLogRows = opts?.setLogRows ?? [];
  const activeProgramId = opts?.activeProgramId !== undefined ? opts.activeProgramId : null;
  const plannedExerciseRows = opts?.plannedExerciseRows ?? [];

  return {
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
    getFirstAsync: jest.fn(async (sql: string) => {
      if ((sql as string).includes('FROM programs')) {
        return activeProgramId ? { id: activeProgramId } : null;
      }
      return null;
    }),
    getAllAsync: jest.fn(async (sql: string) => {
      if ((sql as string).includes('FROM set_logs')) {
        return setLogRows;
      }
      if ((sql as string).includes('FROM planned_exercises')) {
        return plannedExerciseRows;
      }
      return [];
    }),
    execAsync: jest.fn(async () => {}),
  } as unknown as MockDb;
}

const USER_ID = 'user-001';

describe('calibrateExerciseBaselines', () => {
  it('retourne calibrated=0 et exercises=[] quand aucun SetLog', async () => {
    const db = makeMockDb({ setLogRows: [] });
    const result = await calibrateExerciseBaselines(db, USER_ID);
    expect(result).toEqual({ calibrated: 0, exercises: [] });
  });

  it('calcule e1RM (100kg x 5 reps → 116.67) et charge récente', async () => {
    const recentDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const db = makeMockDb({
      setLogRows: [
        { exercise_id: 'ex-bench', load: 100, reps: 5, session_date: recentDate },
        { exercise_id: 'ex-bench', load: 80, reps: 10, session_date: recentDate },
      ],
    });

    const result = await calibrateExerciseBaselines(db, USER_ID);

    expect(result.calibrated).toBe(1);
    expect(result.exercises).toHaveLength(1);

    const bench = result.exercises[0]!;
    expect(bench.exerciseId).toBe('ex-bench');
    expect(bench.e1rm).toBeCloseTo(116.67, 2);
    expect(bench.recentAvgLoad).toBeCloseTo(90, 5);
  });

  it('exclut les exercices dont tous les sets sont hors fenêtre 4 semaines', async () => {
    const oldDate = '2020-01-01';

    const db = makeMockDb({
      setLogRows: [
        { exercise_id: 'ex-bench', load: 100, reps: 5, session_date: oldDate },
      ],
    });

    const result = await calibrateExerciseBaselines(db, USER_ID);
    expect(result.calibrated).toBe(0);
    expect(result.exercises).toHaveLength(0);
  });

  it('effectue un upsert dans exercise_baselines pour chaque exercice calibré', async () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const db = makeMockDb({
      setLogRows: [
        { exercise_id: 'ex-squat', load: 120, reps: 3, session_date: recentDate },
      ],
    });

    await calibrateExerciseBaselines(db, USER_ID);

    const upsertCall = (db.runAsync as jest.Mock).mock.calls.find(
      ([sql]: [string]) => (sql as string).includes('exercise_baselines')
    );

    expect(upsertCall).toBeDefined();
    expect(upsertCall![1]).toContain('ex-squat');
    expect(upsertCall![1]).toContain(USER_ID);
  });

  it('met a jour initial_load dans progression_config du programme actif', async () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const db = makeMockDb({
      setLogRows: [
        { exercise_id: 'ex-bench', load: 100, reps: 5, session_date: recentDate },
      ],
      activeProgramId: 'prog-001',
      plannedExerciseRows: [
        {
          id: 'pe-001',
          exercise_id: 'ex-bench',
          progression_config: JSON.stringify({ increment_kg: 2.5 }),
        },
      ],
    });

    await calibrateExerciseBaselines(db, USER_ID);

    const updateCall = (db.runAsync as jest.Mock).mock.calls.find(
      ([sql]: [string]) => (sql as string).includes('UPDATE planned_exercises')
    );

    expect(updateCall).toBeDefined();
    const updatedConfig = JSON.parse(updateCall![1][0] as string) as Record<string, unknown>;
    expect(updatedConfig.initial_load).toBe(100);
    expect(updatedConfig.increment_kg).toBe(2.5);
  });

  it("ne met pas a jour planned_exercises si l'exercice n'est pas dans le programme actif", async () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const db = makeMockDb({
      setLogRows: [
        { exercise_id: 'ex-bench', load: 100, reps: 5, session_date: recentDate },
      ],
      activeProgramId: 'prog-001',
      plannedExerciseRows: [
        {
          id: 'pe-002',
          exercise_id: 'ex-squat',
          progression_config: '{}',
        },
      ],
    });

    await calibrateExerciseBaselines(db, USER_ID);

    const updateCall = (db.runAsync as jest.Mock).mock.calls.find(
      ([sql]: [string]) => (sql as string).includes('UPDATE planned_exercises')
    );

    expect(updateCall).toBeUndefined();
  });

  it("ne met pas a jour planned_exercises si aucun programme actif", async () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const db = makeMockDb({
      setLogRows: [
        { exercise_id: 'ex-bench', load: 100, reps: 5, session_date: recentDate },
      ],
      activeProgramId: null,
    });

    await calibrateExerciseBaselines(db, USER_ID);

    const updateCall = (db.runAsync as jest.Mock).mock.calls.find(
      ([sql]: [string]) => (sql as string).includes('UPDATE planned_exercises')
    );

    expect(updateCall).toBeUndefined();
  });

  it('calibre plusieurs exercices independamment', async () => {
    const recentDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const db = makeMockDb({
      setLogRows: [
        { exercise_id: 'ex-bench', load: 100, reps: 5, session_date: recentDate },
        { exercise_id: 'ex-squat', load: 140, reps: 5, session_date: recentDate },
      ],
    });

    const result = await calibrateExerciseBaselines(db, USER_ID);

    expect(result.calibrated).toBe(2);
    const ids = result.exercises.map((e) => e.exerciseId);
    expect(ids).toContain('ex-bench');
    expect(ids).toContain('ex-squat');
  });
});
