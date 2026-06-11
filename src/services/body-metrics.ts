import type { SQLiteDatabase } from 'expo-sqlite';
import type { BodyMetric, BodyWeightInput } from '@/types';
import { safeEnqueue } from '@/features/sync';

const TABLE = 'body_metrics';

type BodyMetricRow = {
  id: string;
  user_id: string;
  date: string;
  weight_kg: number | null;
  notes: string | null;
  created_at: string;
};

function rowToBodyMetric(row: BodyMetricRow): BodyMetric {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.date,
    weightKg: row.weight_kg,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/**
 * Payload Supabase — colonnes du schéma remote uniquement (SYNC-03) :
 * l'upsert partiel laisse les mensurations/photos remote à NULL.
 */
function toSupabasePayload(metric: BodyMetric): Record<string, unknown> {
  return {
    id: metric.id,
    user_id: metric.userId,
    date: metric.date,
    weight_kg: metric.weightKg,
    notes: metric.notes,
    created_at: metric.createdAt,
  };
}

/**
 * Insère ou met à jour la pesée du jour (UNIQUE user/date). En re-saisie le
 * même jour, l'id et created_at existants sont réutilisés : la sync pousse
 * un update idempotent sur le même row remote.
 */
export async function upsertBodyWeight(
  db: SQLiteDatabase,
  id: string,
  input: BodyWeightInput
): Promise<BodyMetric> {
  const existing = await getBodyMetricByDate(db, input.userId, input.date);

  const metric: BodyMetric = existing
    ? { ...existing, weightKg: input.weightKg }
    : {
        id,
        userId: input.userId,
        date: input.date,
        weightKg: input.weightKg,
        notes: null,
        createdAt: new Date().toISOString(),
      };

  if (existing) {
    await db.runAsync('UPDATE body_metrics SET weight_kg = ? WHERE id = ?', [
      metric.weightKg,
      metric.id,
    ]);
  } else {
    await db.runAsync(
      `INSERT INTO body_metrics (id, user_id, date, weight_kg, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        metric.id,
        metric.userId,
        metric.date,
        metric.weightKg,
        metric.notes,
        metric.createdAt,
      ]
    );
  }

  await safeEnqueue(
    db,
    TABLE,
    metric.id,
    existing ? 'update' : 'insert',
    toSupabasePayload(metric)
  );
  return metric;
}

export async function getBodyMetricByDate(
  db: SQLiteDatabase,
  userId: string,
  date: string
): Promise<BodyMetric | null> {
  const row = await db.getFirstAsync<BodyMetricRow>(
    'SELECT * FROM body_metrics WHERE user_id = ? AND date = ?',
    [userId, date]
  );
  return row ? rowToBodyMetric(row) : null;
}

/**
 * Pesées depuis une date incluse, ordre chronologique (courbe dashboard).
 */
export async function getBodyMetricsSince(
  db: SQLiteDatabase,
  userId: string,
  sinceDate: string
): Promise<BodyMetric[]> {
  const rows = await db.getAllAsync<BodyMetricRow>(
    `SELECT * FROM body_metrics
     WHERE user_id = ? AND date >= ?
     ORDER BY date ASC`,
    [userId, sinceDate]
  );
  return rows.map(rowToBodyMetric);
}
