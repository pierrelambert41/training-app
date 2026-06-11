import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { retrySessionSummary } from './session-summary-service';
import { retryBlockSummary } from './block-summary-service';
import type { AIRetryType } from './retry-queue';

const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 3;

type QueueRow = {
  id: string;
  session_id: string | null;
  recommendation_id: string | null;
  type: AIRetryType;
  payload: string;
  status: 'pending' | 'done' | 'failed';
  attempts: number;
  created_at: string;
};

export type ProcessPendingResult = {
  processed: number;
  done: number;
  failed: number;
};

type EntryOutcome = 'done' | 'retry' | 'unsupported';

function parsePayload(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function handleEntry(
  db: SQLiteDatabase,
  row: QueueRow,
  fallbackUserId: string,
  supabase: SupabaseClient
): Promise<EntryOutcome> {
  const payload = parsePayload(row.payload);
  const userId = typeof payload.userId === 'string' ? payload.userId : fallbackUserId;

  switch (row.type) {
    case 'session_summary': {
      const sessionId =
        typeof payload.sessionId === 'string' ? payload.sessionId : row.session_id;
      if (!sessionId) return 'unsupported';
      return (await retrySessionSummary(db, sessionId, userId, supabase)) ? 'done' : 'retry';
    }
    case 'block_summary': {
      const blockId = typeof payload.blockId === 'string' ? payload.blockId : null;
      if (!blockId) return 'unsupported';
      return (await retryBlockSummary(db, blockId, userId, supabase)) ? 'done' : 'retry';
    }
    default:
      // plateau / explain_adjustment : déclenchés à la demande par l'utilisateur,
      // pas de retry silencieux en arrière-plan (cf. TA-137/TA-136).
      return 'unsupported';
  }
}

async function markDone(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE ai_retry_queue SET status = 'done', attempts = attempts + 1 WHERE id = ?`,
    [id]
  );
}

async function markFailed(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    `UPDATE ai_retry_queue SET status = 'failed', attempts = attempts + 1 WHERE id = ?`,
    [id]
  );
}

async function markRetried(db: SQLiteDatabase, row: QueueRow): Promise<void> {
  const attempts = row.attempts + 1;
  const status = attempts >= MAX_ATTEMPTS ? 'failed' : 'pending';
  await db.runAsync(`UPDATE ai_retry_queue SET status = ?, attempts = ? WHERE id = ?`, [
    status,
    attempts,
    row.id,
  ]);
}

/**
 * Worker de la queue de retry IA (TA-141). Déclenché au retour réseau
 * (AIQueueBridge, même pattern que SyncService.push).
 *
 * Traite séquentiellement (pas de parallel map : rate limit Claude) au plus
 * BATCH_SIZE entrées 'pending' par cycle, les plus anciennes d'abord.
 * - Succès → status 'done' (jamais re-traitée : le SELECT filtre status='pending').
 * - Échec → attempts + 1 ; au-delà de MAX_ATTEMPTS tentatives → 'failed' définitif.
 * - Types à la demande (plateau, explain_adjustment) ou payload invalide → 'failed' direct.
 *
 * generateProgram / regenerateBlock ne passent JAMAIS par cette queue :
 * leur retry est une action utilisateur explicite (TA-146).
 */
export async function processPendingAICalls(
  db: SQLiteDatabase,
  userId: string,
  supabase: SupabaseClient
): Promise<ProcessPendingResult> {
  const rows = await db.getAllAsync<QueueRow>(
    `SELECT * FROM ai_retry_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
    [BATCH_SIZE]
  );

  const result: ProcessPendingResult = { processed: rows.length, done: 0, failed: 0 };

  for (const row of rows) {
    let outcome: EntryOutcome;
    try {
      outcome = await handleEntry(db, row, userId, supabase);
    } catch {
      outcome = 'retry';
    }

    if (outcome === 'done') {
      await markDone(db, row.id);
      result.done += 1;
    } else if (outcome === 'unsupported') {
      await markFailed(db, row.id);
      result.failed += 1;
    } else {
      await markRetried(db, row);
      if (row.attempts + 1 >= MAX_ATTEMPTS) result.failed += 1;
    }
  }

  return result;
}
