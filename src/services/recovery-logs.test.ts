import {
  getRecoveryLogByDate,
  getRecoveryLogsSince,
  upsertRecoveryLog,
} from './recovery-logs';
import type { SQLiteDatabase } from 'expo-sqlite';

type MockDb = SQLiteDatabase & {
  runAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  getAllAsync: jest.Mock;
};

function makeMockDb(overrides?: Partial<SQLiteDatabase>): MockDb {
  return {
    runAsync: jest.fn(async () => ({ lastInsertRowId: 1, changes: 1 })),
    getAllAsync: jest.fn(async () => []),
    getFirstAsync: jest.fn(async () => null),
    execAsync: jest.fn(async () => {}),
    ...overrides,
  } as unknown as MockDb;
}

const EXISTING_ROW = {
  id: 'rl1',
  user_id: 'u1',
  date: '2026-06-11',
  sleep_hours: 7.5,
  sleep_quality: 6,
  energy: 5,
  stress: null,
  motivation: null,
  soreness: 4,
  joint_pain: null,
  resting_hr: null,
  hrv: null,
  weight_kg: null,
  notes: 'ancienne note',
  created_at: '2026-06-11T08:00:00.000Z',
};

describe('recovery_logs repository', () => {
  describe('upsertRecoveryLog', () => {
    it('insère un nouveau log avec les champs du check-in, le reste à null', async () => {
      const db = makeMockDb();
      const log = await upsertRecoveryLog(db, 'rl-new', {
        userId: 'u1',
        date: '2026-06-11',
        sleepQuality: 7,
        energy: 6,
        soreness: 3,
        notes: 'bien dormi',
      });

      expect(log.id).toBe('rl-new');
      expect(log.sleepQuality).toBe(7);
      expect(log.energy).toBe(6);
      expect(log.soreness).toBe(3);
      expect(log.notes).toBe('bien dormi');
      expect(log.sleepHours).toBeNull();
      expect(log.weightKg).toBeNull();

      // 1er runAsync = INSERT local, 2e = enqueue sync
      expect(db.runAsync).toHaveBeenCalledTimes(2);
      expect((db.runAsync.mock.calls[0] as [string])[0]).toContain(
        'INSERT INTO recovery_logs'
      );
    });

    it('enqueue un payload Supabase snake_case en insert', async () => {
      const db = makeMockDb();
      await upsertRecoveryLog(db, 'rl-new', {
        userId: 'u1',
        date: '2026-06-11',
        sleepQuality: 7,
        energy: 6,
        soreness: 3,
      });

      const enqueueParams = db.runAsync.mock.calls[1][1] as unknown[];
      expect(enqueueParams[0]).toBe('recovery_logs');
      expect(enqueueParams[1]).toBe('rl-new');
      expect(enqueueParams[2]).toBe('insert');
      const payload = JSON.parse(enqueueParams[3] as string);
      expect(payload).toMatchObject({
        id: 'rl-new',
        user_id: 'u1',
        date: '2026-06-11',
        sleep_quality: 7,
        energy: 6,
        soreness: 3,
        notes: null,
      });
      // Colonnes hors schéma remote interdites (pitfall SYNC-03)
      expect(payload).not.toHaveProperty('device_id');
      expect(payload).not.toHaveProperty('synced_at');
      expect(payload).not.toHaveProperty('updated_at');
    });

    it('réutilise id et created_at existants en re-saisie le même jour (update)', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(EXISTING_ROW);

      const log = await upsertRecoveryLog(db, 'id-ignore', {
        userId: 'u1',
        date: '2026-06-11',
        sleepQuality: 8,
        energy: 7,
        soreness: 2,
        notes: null,
      });

      expect(log.id).toBe('rl1');
      expect(log.createdAt).toBe('2026-06-11T08:00:00.000Z');
      expect(log.sleepQuality).toBe(8);
      expect(log.notes).toBeNull();
      // Champs hors check-in préservés
      expect(log.sleepHours).toBe(7.5);

      expect((db.runAsync.mock.calls[0] as [string])[0]).toContain(
        'UPDATE recovery_logs'
      );
      const enqueueParams = db.runAsync.mock.calls[1][1] as unknown[];
      expect(enqueueParams[1]).toBe('rl1');
      expect(enqueueParams[2]).toBe('update');
    });
  });

  describe('getRecoveryLogByDate', () => {
    it('mappe le row snake_case vers RecoveryLog', async () => {
      const db = makeMockDb();
      db.getFirstAsync.mockResolvedValueOnce(EXISTING_ROW);
      const log = await getRecoveryLogByDate(db, 'u1', '2026-06-11');
      expect(log).toMatchObject({
        id: 'rl1',
        userId: 'u1',
        date: '2026-06-11',
        sleepHours: 7.5,
        sleepQuality: 6,
        soreness: 4,
        notes: 'ancienne note',
      });
    });

    it('retourne null si aucun log pour la date', async () => {
      const db = makeMockDb();
      expect(await getRecoveryLogByDate(db, 'u1', '2026-06-11')).toBeNull();
    });
  });

  describe('getRecoveryLogsSince', () => {
    it('filtre par user et date plancher, ordre chronologique', async () => {
      const db = makeMockDb();
      await getRecoveryLogsSince(db, 'u1', '2026-06-04');
      const call = db.getAllAsync.mock.calls[0] as [string, unknown[]];
      expect(call[0]).toContain('date >= ?');
      expect(call[0]).toContain('ORDER BY date ASC');
      expect(call[1]).toEqual(['u1', '2026-06-04']);
    });
  });
});
