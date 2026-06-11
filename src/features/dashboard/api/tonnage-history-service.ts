import type { SQLiteDatabase } from 'expo-sqlite';
import { setTonnageKg } from '@/lib/session-tonnage';
import type { LogType } from '@/types';
import type { TonnagePoint, TonnageWorkoutDay } from '../domain/tonnage-history';

export type { TonnagePoint, TonnageWorkoutDay };

function cutoffDate(windowDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() - windowDays);
  return d.toISOString().slice(0, 10);
}

/**
 * Jours d'entraînement ayant au moins 2 séances complétées sur la fenêtre —
 * l'évolution du tonnage n'a de sens qu'à séance type répétée.
 */
export async function getTonnageWorkoutDays(
  db: SQLiteDatabase,
  userId: string,
  windowDays = 90
): Promise<TonnageWorkoutDay[]> {
  const rows = await db.getAllAsync<{ id: string; title: string; session_count: number }>(
    `SELECT wd.id, wd.title, COUNT(s.id) AS session_count
     FROM sessions s
     JOIN workout_days wd ON wd.id = s.workout_day_id
     WHERE s.user_id = ? AND s.status = 'completed' AND s.date >= ?
     GROUP BY wd.id, wd.title
     HAVING COUNT(s.id) >= 2
     ORDER BY session_count DESC, wd.title ASC`,
    [userId, cutoffDate(windowDays)]
  );
  return rows.map((r) => ({ id: r.id, title: r.title, sessionCount: r.session_count }));
}

type TonnageSetRow = {
  session_id: string;
  date: string;
  load: number | null;
  reps: number | null;
  log_type: string;
  bodyweight_factor: number | null;
};

/**
 * Tonnage par séance complétée d'un jour d'entraînement donné (kg canonique).
 * Le poids du corps utilisé pour les exos bodyweight est la dernière pesée
 * connue ≤ date de chaque séance.
 */
export async function getTonnageHistory(
  db: SQLiteDatabase,
  userId: string,
  workoutDayId: string,
  windowDays = 90
): Promise<TonnagePoint[]> {
  const rows = await db.getAllAsync<TonnageSetRow>(
    `SELECT s.id AS session_id, s.date AS date, sl.load, sl.reps,
            e.log_type AS log_type, e.bodyweight_factor AS bodyweight_factor
     FROM set_logs sl
     JOIN sessions s ON s.id = sl.session_id
     JOIN exercises e ON e.id = sl.exercise_id
     WHERE s.user_id = ? AND s.workout_day_id = ?
       AND s.status = 'completed' AND sl.completed = 1
       AND s.date >= ?
     ORDER BY s.date ASC, s.id ASC`,
    [userId, workoutDayId, cutoffDate(windowDays)]
  );

  const metrics = await db.getAllAsync<{ date: string; weight_kg: number }>(
    `SELECT date, weight_kg FROM body_metrics
     WHERE user_id = ? AND weight_kg IS NOT NULL
     ORDER BY date ASC`,
    [userId]
  );

  function bodyWeightAt(date: string): number | null {
    let weight: number | null = null;
    for (const m of metrics) {
      if (m.date > date) break;
      weight = m.weight_kg;
    }
    return weight;
  }

  const bySession = new Map<string, TonnagePoint>();
  for (const row of rows) {
    let point = bySession.get(row.session_id);
    if (!point) {
      point = { sessionId: row.session_id, date: row.date, tonnageKg: 0, missingBodyweight: false };
      bySession.set(row.session_id, point);
    }
    const { kg, missingBodyweight } = setTonnageKg(
      {
        logType: row.log_type as LogType,
        load: row.load,
        reps: row.reps,
        completed: true,
        bodyweightFactor: row.bodyweight_factor,
      },
      bodyWeightAt(row.date)
    );
    point.tonnageKg += kg;
    if (missingBodyweight) point.missingBodyweight = true;
  }

  return [...bySession.values()].map((p) => ({ ...p, tonnageKg: Math.round(p.tonnageKg) }));
}
