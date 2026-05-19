import type { SQLiteDatabase } from 'expo-sqlite';
import { generateUUID } from '@/utils/uuid';

export type AIRetryType =
  | 'session_summary'
  | 'plateau'
  | 'block_summary'
  | 'explain_adjustment';

export type AIRetryQueueInput = {
  sessionId?: string;
  recommendationId?: string;
  type: AIRetryType;
  payload: Record<string, unknown>;
};

/**
 * Insère une entrée dans la queue de retry IA.
 * L'orchestration du retry (TA-141) consomme cette table.
 * Le retry worker met à jour status → 'done' ou 'failed'.
 */
export async function enqueueAIRetry(
  db: SQLiteDatabase,
  input: AIRetryQueueInput
): Promise<void> {
  const id = generateUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO ai_retry_queue (id, session_id, recommendation_id, type, payload, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`,
    [
      id,
      input.sessionId ?? null,
      input.recommendationId ?? null,
      input.type,
      JSON.stringify(input.payload),
      now,
    ]
  );
}
