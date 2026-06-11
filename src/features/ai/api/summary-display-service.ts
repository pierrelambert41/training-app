import type { SQLiteDatabase } from 'expo-sqlite';
import {
  blockSummaryFromMetadata,
  sessionSummaryFromRecommendation,
} from '../domain/recommendation-mappers';
import type { BlockSummary, SessionSummary } from '../types/ai-responses';

type SummaryRow = {
  message: string;
  metadata: string;
  date: string;
};

function parseMetadata(raw: string): Record<string, unknown> {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export type LatestSessionSummary = {
  summary: SessionSummary;
  sessionDate: string;
};

/**
 * Dernier résumé IA de séance de l'utilisateur (TA-140, section "Dernière séance").
 * Exclut les résumés de bloc TA-138 (même type/source, discriminés par metadata.block_id).
 * Retourne null si aucun résumé persisté.
 */
export async function getLatestSessionSummary(
  db: SQLiteDatabase,
  userId: string
): Promise<LatestSessionSummary | null> {
  const rows = await db.getAllAsync<SummaryRow>(
    `SELECT r.message, r.metadata, s.date
     FROM recommendations r
     JOIN sessions s ON s.id = r.session_id
     WHERE s.user_id = ? AND r.type = 'summary' AND r.source = 'ai'
     ORDER BY s.date DESC, r.created_at DESC
     LIMIT 20`,
    [userId]
  );

  for (const row of rows) {
    const metadata = parseMetadata(row.metadata);
    if (metadata.block_id !== undefined) continue;
    return {
      summary: sessionSummaryFromRecommendation(row.message, metadata),
      sessionDate: row.date,
    };
  }
  return null;
}

/**
 * Résumé IA persisté d'un bloc (TA-140, section "Bilan du bloc").
 * Lit la Recommendation type 'summary' source 'ai' ancrée sur une session du bloc
 * avec metadata.block_id correspondant. Retourne null si pas encore généré.
 */
export async function getStoredBlockSummary(
  db: SQLiteDatabase,
  blockId: string
): Promise<BlockSummary | null> {
  const rows = await db.getAllAsync<SummaryRow>(
    `SELECT r.message, r.metadata, s.date
     FROM recommendations r
     JOIN sessions s ON s.id = r.session_id
     WHERE s.block_id = ? AND r.type = 'summary' AND r.source = 'ai'
     ORDER BY r.created_at DESC`,
    [blockId]
  );

  for (const row of rows) {
    const metadata = parseMetadata(row.metadata);
    if (metadata.block_id === blockId) {
      return blockSummaryFromMetadata(metadata);
    }
  }
  return null;
}
