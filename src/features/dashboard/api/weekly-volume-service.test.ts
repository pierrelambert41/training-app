import type { SQLiteDatabase } from 'expo-sqlite';
import { getWeeklyVolumeByMuscle } from './weekly-volume-service';

type MockDb = SQLiteDatabase & { getAllAsync: jest.Mock };

function makeMockDb(): MockDb {
  return { getAllAsync: jest.fn(async () => []) } as unknown as MockDb;
}

describe('getWeeklyVolumeByMuscle', () => {
  it('filtre sets complétés de séances complétées sur les bornes incluses', async () => {
    const db = makeMockDb();
    await getWeeklyVolumeByMuscle(db, 'u1', '2026-06-08', '2026-06-14');
    const [sql, params] = db.getAllAsync.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("s.status = 'completed'");
    expect(sql).toContain('sl.completed = 1');
    expect(sql).toContain('s.date >= ? AND s.date <= ?');
    expect(params).toEqual(['u1', '2026-06-08', '2026-06-14']);
  });

  it('agrège via le comptage agoniste', async () => {
    const db = makeMockDb();
    db.getAllAsync.mockResolvedValueOnce([
      { primary_muscles: '["chest","triceps"]' },
      { primary_muscles: '["chest"]' },
    ]);
    const volumes = await getWeeklyVolumeByMuscle(db, 'u1', '2026-06-08', '2026-06-14');
    expect(volumes).toEqual([
      { muscle: 'chest', sets: 2 },
      { muscle: 'triceps', sets: 1 },
    ]);
  });
});
