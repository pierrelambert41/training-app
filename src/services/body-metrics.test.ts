import {
  getBodyMetricByDate,
  getBodyMetricsSince,
  upsertBodyWeight,
} from './body-metrics';
import type { SQLiteDatabase } from 'expo-sqlite';

type MockDb = SQLiteDatabase & {
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
};

function makeMockDb(): MockDb {
  return {
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    execAsync: jest.fn(async () => {}),
  } as unknown as MockDb;
}

const EXISTING_ROW = {
  id: 'bm1',
  user_id: 'u1',
  date: '2026-06-11',
  weight_kg: 82.5,
  notes: null,
  created_at: '2026-06-11T07:00:00.000Z',
};

describe('body_metrics repository', () => {
  describe('upsertBodyWeight', () => {
    it('insère une nouvelle pesée et enqueue un payload snake_case', async () => {
      const db = makeMockDb();
      const metric = await upsertBodyWeight(db, 'bm-new', {
        userId: 'u1',
        date: '2026-06-11',
        weightKg: 81.2,
      });

      expect(metric.id).toBe('bm-new');
      expect(metric.weightKg).toBe(81.2);
      expect(db.runAsync).toHaveBeenCalledTimes(2);
      expect((db.runAsync.mock.calls[0] as [string])[0]).toContain(
        'INSERT INTO body_metrics'
      );

      const enqueueParams = db.runAsync.mock.calls[1][1] as unknown[];
      expect(enqueueParams[0]).toBe('body_metrics');
      expect(enqueueParams[2]).toBe('insert');
      const payload = JSON.parse(enqueueParams[3] as string);
      expect(payload).toMatchObject({
        id: 'bm-new',
        user_id: 'u1',
        date: '2026-06-11',
        weight_kg: 81.2,
      });
      // SYNC-03 : aucune colonne hors schéma remote
      expect(payload).not.toHaveProperty('updated_at');
      expect(payload).not.toHaveProperty('device_id');
    });

    it('réutilise id/created_at en re-saisie le même jour (update idempotent)', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(EXISTING_ROW);

      const metric = await upsertBodyWeight(db, 'id-ignore', {
        userId: 'u1',
        date: '2026-06-11',
        weightKg: 82.0,
      });

      expect(metric.id).toBe('bm1');
      expect(metric.createdAt).toBe('2026-06-11T07:00:00.000Z');
      expect(metric.weightKg).toBe(82.0);
      expect((db.runAsync.mock.calls[0] as [string])[0]).toContain(
        'UPDATE body_metrics'
      );
      const enqueueParams = db.runAsync.mock.calls[1][1] as unknown[];
      expect(enqueueParams[1]).toBe('bm1');
      expect(enqueueParams[2]).toBe('update');
    });
  });

  describe('getBodyMetricByDate', () => {
    it('mappe le row vers BodyMetric', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(EXISTING_ROW);
      const metric = await getBodyMetricByDate(db, 'u1', '2026-06-11');
      expect(metric).toEqual({
        id: 'bm1',
        userId: 'u1',
        date: '2026-06-11',
        weightKg: 82.5,
        notes: null,
        createdAt: '2026-06-11T07:00:00.000Z',
      });
    });
  });

  describe('getBodyMetricsSince', () => {
    it('filtre par user et date plancher, ordre chronologique', async () => {
      const db = makeMockDb();
      await getBodyMetricsSince(db, 'u1', '2026-03-13');
      const call = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(call[0]).toContain('date >= ?');
      expect(call[0]).toContain('ORDER BY date ASC');
      expect(call[1]).toEqual(['u1', '2026-03-13']);
    });
  });
});
