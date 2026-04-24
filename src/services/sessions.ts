import type { SQLiteDatabase } from 'expo-sqlite';

type SessionCountRow = {
  workout_day_id: string;
  count: number;
};

export async function getSessionCountsByBlockId(
  db: SQLiteDatabase,
  blockId: string
): Promise<Record<string, number>> {
  const rows = await db.getAllAsync<SessionCountRow>(
    `SELECT workout_day_id, COUNT(*) as count
     FROM sessions
     WHERE block_id = ? AND status = 'completed'
     GROUP BY workout_day_id`,
    [blockId]
  );

  return rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.workout_day_id] = row.count;
    return acc;
  }, {});
}
