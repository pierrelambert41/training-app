import type { SQLiteDatabase } from 'expo-sqlite';
import type { FatiguePoint } from '../domain/fatigue-trend';

const DEFAULT_WINDOW_DAYS = 60;

type FatigueRow = {
  date: string;
  fatigue_score: number;
};

/**
 * Historique des fatigue_score persistés par le moteur (TA-105) sur les
 * séances complétées de la fenêtre (60 jours par défaut), tri chronologique.
 */
export async function getFatigueHistory(
  db: SQLiteDatabase,
  userId: string,
  windowDays: number = DEFAULT_WINDOW_DAYS
): Promise<FatiguePoint[]> {
  const cutoff = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const rows = await db.getAllAsync<FatigueRow>(
    `SELECT date, fatigue_score
     FROM sessions
     WHERE user_id = ?
       AND status = 'completed'
       AND fatigue_score IS NOT NULL
       AND date >= ?
     ORDER BY date ASC, created_at ASC`,
    [userId, cutoff]
  );

  return rows.map((r) => ({ date: r.date, score: r.fatigue_score }));
}

/**
 * Dates des séances complétées rattachées à un bloc (pour la compliance).
 */
export async function getCompletedSessionDates(
  db: SQLiteDatabase,
  blockId: string
): Promise<string[]> {
  const rows = await db.getAllAsync<{ date: string }>(
    `SELECT date FROM sessions
     WHERE block_id = ? AND status = 'completed'
     ORDER BY date ASC`,
    [blockId]
  );
  return rows.map((r) => r.date);
}
