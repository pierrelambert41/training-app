import type { SQLiteDatabase } from 'expo-sqlite';
import type { DailyCheckinInput, RecoveryLog } from '@/types';
import { safeEnqueue } from '@/features/sync';

const TABLE = 'recovery_logs';

type RecoveryLogRow = {
  id: string;
  user_id: string;
  date: string;
  sleep_hours: number | null;
  sleep_quality: number | null;
  energy: number | null;
  stress: number | null;
  motivation: number | null;
  soreness: number | null;
  joint_pain: number | null;
  resting_hr: number | null;
  hrv: number | null;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
};

function rowToRecoveryLog(row: RecoveryLogRow): RecoveryLog {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    sleepHours: row.sleep_hours,
    sleepQuality: row.sleep_quality,
    energy: row.energy,
    stress: row.stress,
    motivation: row.motivation,
    soreness: row.soreness,
    jointPain: row.joint_pain,
    restingHr: row.resting_hr,
    hrv: row.hrv,
    weightKg: row.weight_kg,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/**
 * Payload Supabase — snake_case, colonnes du schéma remote uniquement
 * (cf. ADR-012). Pas de device_id ni synced_at sur cette table.
 */
function toSupabasePayload(log: RecoveryLog): Record<string, unknown> {
  return {
    id: log.id,
    user_id: log.userId,
    date: log.date,
    sleep_hours: log.sleepHours,
    sleep_quality: log.sleepQuality,
    energy: log.energy,
    stress: log.stress,
    motivation: log.motivation,
    soreness: log.soreness,
    joint_pain: log.jointPain,
    resting_hr: log.restingHr,
    hrv: log.hrv,
    weight_kg: log.weightKg,
    notes: log.notes,
    created_at: log.createdAt,
  };
}

/**
 * Insère ou met à jour le check-in du jour (une seule entrée par user/date —
 * UNIQUE en SQLite). En cas de re-saisie le même jour, l'id existant est
 * réutilisé : la sync pousse un update idempotent sur le même row remote.
 *
 * Les champs hors check-in (sleepHours, HR, HRV, poids…) sont préservés
 * s'ils existent déjà (import futur, autre saisie) et null à la création.
 */
export async function upsertRecoveryLog(
  db: SQLiteDatabase,
  id: string,
  input: DailyCheckinInput
): Promise<RecoveryLog> {
  const existing = await getRecoveryLogByDate(db, input.userId, input.date);
  const now = new Date().toISOString();

  const log: RecoveryLog = existing
    ? {
        ...existing,
        sleepQuality: input.sleepQuality,
        energy: input.energy,
        soreness: input.soreness,
        notes: input.notes ?? null,
      }
    : {
        id,
        userId: input.userId,
        date: input.date,
        sleepHours: null,
        sleepQuality: input.sleepQuality,
        energy: input.energy,
        stress: null,
        motivation: null,
        soreness: input.soreness,
        jointPain: null,
        restingHr: null,
        hrv: null,
        weightKg: null,
        notes: input.notes ?? null,
        createdAt: now,
      };

  if (existing) {
    await db.runAsync(
      `UPDATE recovery_logs
         SET sleep_quality = ?, energy = ?, soreness = ?, notes = ?
       WHERE id = ?`,
      [log.sleepQuality, log.energy, log.soreness, log.notes, log.id]
    );
  } else {
    await db.runAsync(
      `INSERT INTO recovery_logs (
        id, user_id, date, sleep_hours, sleep_quality, energy, stress,
        motivation, soreness, joint_pain, resting_hr, hrv, weight_kg,
        notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.id,
        log.userId,
        log.date,
        log.sleepHours,
        log.sleepQuality,
        log.energy,
        log.stress,
        log.motivation,
        log.soreness,
        log.jointPain,
        log.restingHr,
        log.hrv,
        log.weightKg,
        log.notes,
        log.createdAt,
      ]
    );
  }

  await safeEnqueue(
    db,
    TABLE,
    log.id,
    existing ? 'update' : 'insert',
    toSupabasePayload(log)
  );
  return log;
}

export async function getRecoveryLogByDate(
  db: SQLiteDatabase,
  userId: string,
  date: string
): Promise<RecoveryLog | null> {
  const row = await db.getFirstAsync<RecoveryLogRow>(
    'SELECT * FROM recovery_logs WHERE user_id = ? AND date = ?',
    [userId, date]
  );
  return row ? rowToRecoveryLog(row) : null;
}

/**
 * Logs depuis une date incluse, ordre chronologique. Utilisé par le fatigue
 * score (fenêtre 7 jours) et les futures vues analytics (Phase 8).
 */
export async function getRecoveryLogsSince(
  db: SQLiteDatabase,
  userId: string,
  sinceDate: string
): Promise<RecoveryLog[]> {
  const rows = await db.getAllAsync<RecoveryLogRow>(
    `SELECT * FROM recovery_logs
     WHERE user_id = ? AND date >= ?
     ORDER BY date ASC`,
    [userId, sinceDate]
  );
  return rows.map(rowToRecoveryLog);
}
