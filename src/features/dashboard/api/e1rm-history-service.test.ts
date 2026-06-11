import type { SQLiteDatabase } from 'expo-sqlite';
import { getE1rmHistory, getExercisesWithHistory } from './e1rm-history-service';

type MockDb = SQLiteDatabase & { getAllAsync: jest.Mock };

function makeMockDb(): MockDb {
  return {
    getAllAsync: jest.fn(async () => []),
  } as unknown as MockDb;
}

describe('getExercisesWithHistory', () => {
  it('filtre sur user, séances complétées, sets complétés et log_type weight_reps', async () => {
    const db = makeMockDb();
    await getExercisesWithHistory(db, 'u1');
    const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("s.status = 'completed'");
    expect(sql).toContain('sl.completed = 1');
    expect(sql).toContain("e.log_type = 'weight_reps'");
    expect(sql).toContain('ORDER BY sessionCount DESC');
    expect(params).toEqual(['u1']);
  });
});

describe('getE1rmHistory', () => {
  it('borne la fenêtre à 90 jours par défaut et calcule le meilleur e1RM par séance', async () => {
    const db = makeMockDb();
    db.getAllAsync.mockResolvedValueOnce([
      { date: '2026-06-01', load: 100, reps: 5 },
      { date: '2026-06-01', load: 60, reps: 12 },
    ]);

    const points = await getE1rmHistory(db, 'u1', 'ex1');

    const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('s.date >= ?');
    expect(params[0]).toBe('u1');
    expect(params[1]).toBe('ex1');
    const cutoff = params[2] as string;
    const expectedCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(cutoff).toBe(expectedCutoff);

    expect(points).toEqual([{ date: '2026-06-01', e1rm: 116.7 }]);
  });
});
