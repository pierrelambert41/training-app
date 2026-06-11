import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getCompletedSessionDates,
  getFatigueHistory,
} from './fatigue-compliance-service';

type MockDb = SQLiteDatabase & { getAllAsync: jest.Mock };

function makeMockDb(): MockDb {
  return { getAllAsync: jest.fn(async () => []) } as unknown as MockDb;
}

describe('getFatigueHistory', () => {
  it('filtre les séances complétées avec fatigue_score sur 60 jours', async () => {
    const db = makeMockDb();
    db.getAllAsync.mockResolvedValueOnce([
      { date: '2026-06-01', fatigue_score: 3.5 },
      { date: '2026-06-08', fatigue_score: 6 },
    ]);

    const points = await getFatigueHistory(db, 'u1');

    const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("status = 'completed'");
    expect(sql).toContain('fatigue_score IS NOT NULL');
    expect(params[0]).toBe('u1');
    const expectedCutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    expect(params[1]).toBe(expectedCutoff);

    expect(points).toEqual([
      { date: '2026-06-01', score: 3.5 },
      { date: '2026-06-08', score: 6 },
    ]);
  });
});

describe('getCompletedSessionDates', () => {
  it('retourne les dates des séances complétées du bloc', async () => {
    const db = makeMockDb();
    db.getAllAsync.mockResolvedValueOnce([
      { date: '2026-06-02' },
      { date: '2026-06-04' },
    ]);
    const dates = await getCompletedSessionDates(db, 'b1');
    const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('block_id = ?');
    expect(sql).toContain("status = 'completed'");
    expect(params).toEqual(['b1']);
    expect(dates).toEqual(['2026-06-02', '2026-06-04']);
  });
});
