export type SyncAction = 'insert' | 'update' | 'delete';

/**
 * Liste exhaustive des tables synchronisables. Étendre ici à chaque ajout
 * d'entité offline-first synchronisée vers Supabase. Les noms doivent
 * matcher exactement les tables Postgres côté serveur (snake_case, pluriel).
 *
 * Phase 2 : exercises, exercise_favorites
 * Phase 3 : programs, blocks, workout_days, planned_exercises
 * Phase 4 : sessions, set_logs (TA-72)
 * Phase 5 : recommendations (TA-103)
 * Phase 7 : ai_context_profiles (TA-132) — exclue de CONFLICT_CHECKED_TABLES (table dérivée recalculable)
 */
export type SyncTableName =
  | 'exercises'
  | 'exercise_favorites'
  | 'programs'
  | 'blocks'
  | 'workout_days'
  | 'planned_exercises'
  | 'sessions'
  | 'set_logs'
  | 'recommendations'
  | 'ai_context_profiles';

export type SyncQueueRecord = {
  id: number;
  tableName: SyncTableName;
  recordId: string;
  action: SyncAction;
  payload: string;
  createdAt: string;
  synced: boolean;
};
