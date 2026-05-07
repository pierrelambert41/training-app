import type { SQLiteDatabase } from 'expo-sqlite';

export async function resetUserData(db: SQLiteDatabase, userId: string): Promise<void> {
  await db.runAsync(
    'DELETE FROM recommendations WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)',
    [userId]
  );
  await db.runAsync(
    'DELETE FROM set_logs WHERE session_id IN (SELECT id FROM sessions WHERE user_id = ?)',
    [userId]
  );
  await db.runAsync('DELETE FROM sessions WHERE user_id = ?', [userId]);

  const programs = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM programs WHERE user_id = ?',
    [userId]
  );
  for (const { id: programId } of programs) {
    const blocks = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM blocks WHERE program_id = ?',
      [programId]
    );
    for (const { id: blockId } of blocks) {
      const days = await db.getAllAsync<{ id: string }>(
        'SELECT id FROM workout_days WHERE block_id = ?',
        [blockId]
      );
      for (const { id: dayId } of days) {
        await db.runAsync('DELETE FROM planned_exercises WHERE workout_day_id = ?', [dayId]);
      }
      await db.runAsync('DELETE FROM workout_days WHERE block_id = ?', [blockId]);
    }
    await db.runAsync('DELETE FROM blocks WHERE program_id = ?', [programId]);
    await db.runAsync('DELETE FROM programs WHERE id = ?', [programId]);
  }
}
