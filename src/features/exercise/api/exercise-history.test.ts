import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getExerciseHistory,
  getLatestLoadRecommendation,
  getLatestPlateauRecommendation,
} from './exercise-history';

function makeRecoRow(overrides: Partial<{
  id: string;
  session_id: string;
  exercise_id: string;
  type: string;
  action: string;
  created_at: string;
}> = {}) {
  return {
    id: 'rec-1',
    session_id: 'sess-1',
    exercise_id: 'ex-1',
    source: 'rules_engine',
    type: 'load_change',
    message: 'Augmenter la charge',
    next_load: 82.5,
    next_rep_target: null,
    next_rir_target: null,
    action: 'increase',
    confidence: 0.9,
    metadata: '{}',
    created_at: '2026-05-01T10:00:00Z',
    ...overrides,
  };
}

function makeHistoryRow(sessionId: string, date: string, load: number, reps: number, rir: number) {
  return { session_id: sessionId, session_date: date, load, reps, rir };
}

describe('getExerciseHistory', () => {
  it('retourne vide si aucun set log', async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([]),
    } as unknown as SQLiteDatabase;

    const result = await getExerciseHistory(db, 'ex-1');
    expect(result).toEqual([]);
  });

  it('retourne le meilleur set par session (charge max en premier)', async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([
        makeHistoryRow('sess-1', '2026-05-01', 80, 5, 2),
        makeHistoryRow('sess-1', '2026-05-01', 75, 5, 3),
      ]),
    } as unknown as SQLiteDatabase;

    const result = await getExerciseHistory(db, 'ex-1');
    expect(result).toHaveLength(1);
    expect(result[0].bestSet.load).toBe(80);
  });

  it('group correctement plusieurs sessions distinctes', async () => {
    const db = {
      getAllAsync: jest.fn().mockResolvedValue([
        makeHistoryRow('sess-2', '2026-05-02', 82.5, 5, 2),
        makeHistoryRow('sess-1', '2026-05-01', 80, 5, 2),
      ]),
    } as unknown as SQLiteDatabase;

    const result = await getExerciseHistory(db, 'ex-1');
    expect(result).toHaveLength(2);
    expect(result[0].date).toBe('2026-05-02');
    expect(result[1].date).toBe('2026-05-01');
  });

  it('respecte la limite de 5 sessions', async () => {
    const rows = [
      makeHistoryRow('s6', '2026-05-06', 90, 5, 1),
      makeHistoryRow('s5', '2026-05-05', 87.5, 5, 2),
      makeHistoryRow('s4', '2026-05-04', 85, 5, 2),
      makeHistoryRow('s3', '2026-05-03', 85, 5, 2),
      makeHistoryRow('s2', '2026-05-02', 82.5, 5, 2),
      makeHistoryRow('s1', '2026-05-01', 80, 5, 3),
    ];
    const db = {
      getAllAsync: jest.fn().mockResolvedValue(rows),
    } as unknown as SQLiteDatabase;

    const result = await getExerciseHistory(db, 'ex-1');
    expect(result).toHaveLength(5);
    expect(result[0].sessionId).toBe('s6');
  });

  it('respecte une limite custom', async () => {
    const rows = [
      makeHistoryRow('s3', '2026-05-03', 85, 5, 2),
      makeHistoryRow('s2', '2026-05-02', 82.5, 5, 2),
      makeHistoryRow('s1', '2026-05-01', 80, 5, 3),
    ];
    const db = {
      getAllAsync: jest.fn().mockResolvedValue(rows),
    } as unknown as SQLiteDatabase;

    const result = await getExerciseHistory(db, 'ex-1', 2);
    expect(result).toHaveLength(2);
  });
});

describe('getLatestLoadRecommendation', () => {
  it('retourne null si aucune recommendation', async () => {
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
    } as unknown as SQLiteDatabase;

    const result = await getLatestLoadRecommendation(db, 'ex-1');
    expect(result).toBeNull();
  });

  it('retourne la recommendation parsee avec metadata', async () => {
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue(makeRecoRow({ action: 'increase' })),
    } as unknown as SQLiteDatabase;

    const result = await getLatestLoadRecommendation(db, 'ex-1');
    expect(result).not.toBeNull();
    expect(result?.action).toBe('increase');
    expect(result?.type).toBe('load_change');
    expect(result?.metadata).toEqual({});
  });

  it('passe le bon exerciseId dans la query', async () => {
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
    } as unknown as SQLiteDatabase;

    await getLatestLoadRecommendation(db, 'my-exercise-id');
    expect(db.getFirstAsync).toHaveBeenCalledWith(
      expect.stringContaining('load_change'),
      ['my-exercise-id']
    );
  });
});

describe('getLatestPlateauRecommendation', () => {
  it('retourne null si aucun plateau', async () => {
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue(null),
    } as unknown as SQLiteDatabase;

    const result = await getLatestPlateauRecommendation(db, 'ex-1');
    expect(result).toBeNull();
  });

  it('retourne la recommendation plateau parsee', async () => {
    const plateauRow = makeRecoRow({ type: 'plateau', action: 'maintain' });
    const db = {
      getFirstAsync: jest.fn().mockResolvedValue(plateauRow),
    } as unknown as SQLiteDatabase;

    const result = await getLatestPlateauRecommendation(db, 'ex-1');
    expect(result?.type).toBe('plateau');
    expect(result?.action).toBe('maintain');
  });
});
