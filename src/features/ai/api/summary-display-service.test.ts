/**
 * Tests TA-140 — lecture des résumés IA persistés pour l'affichage.
 *
 * Vérifie :
 * - getLatestSessionSummary : retourne le dernier résumé de séance, exclut les résumés de bloc (metadata.block_id)
 * - getLatestSessionSummary : null si aucun résumé
 * - getStoredBlockSummary : retourne la BlockSummary du bloc (matching metadata.block_id), null sinon
 * - metadata JSON invalide → ignoré sans crash
 */

import type { SQLiteDatabase } from 'expo-sqlite';
import {
  getLatestSessionSummary,
  getStoredBlockSummary,
} from './summary-display-service';

type Row = { message: string; metadata: string; date: string };

function makeDb(rows: Row[]): SQLiteDatabase {
  return {
    getAllAsync: jest.fn(async () => rows),
  } as unknown as SQLiteDatabase;
}

const sessionSummaryRow: Row = {
  message: 'Bonne séance.',
  metadata: JSON.stringify({
    overall_rating: 'good',
    highlights: ['PR squat'],
    concerns: [],
    fatigue_note: 'OK',
    next_session_note: 'Continuer.',
  }),
  date: '2026-06-08',
};

const blockSummaryRow: Row = {
  message: 'Bon bloc.',
  metadata: JSON.stringify({
    block_id: 'block-1',
    title: 'Bloc Hypertrophie',
    duration_weeks: 6,
    overall_assessment: 'Bon bloc.',
    top_progressions: ['Bench +5kg'],
    stagnations: [],
    compliance_note: '87%',
    next_block_recommendation: 'Volume +',
  }),
  date: '2026-06-09',
};

describe('getLatestSessionSummary', () => {
  it('retourne le dernier résumé de séance avec sa date', async () => {
    const result = await getLatestSessionSummary(makeDb([sessionSummaryRow]), 'user-1');
    expect(result).not.toBeNull();
    expect(result!.summary.summary).toBe('Bonne séance.');
    expect(result!.summary.overall_rating).toBe('good');
    expect(result!.sessionDate).toBe('2026-06-08');
  });

  it('exclut les résumés de bloc (metadata.block_id) même plus récents', async () => {
    const result = await getLatestSessionSummary(
      makeDb([blockSummaryRow, sessionSummaryRow]),
      'user-1'
    );
    expect(result!.summary.summary).toBe('Bonne séance.');
  });

  it('null si aucun résumé de séance', async () => {
    expect(await getLatestSessionSummary(makeDb([]), 'user-1')).toBeNull();
    expect(await getLatestSessionSummary(makeDb([blockSummaryRow]), 'user-1')).toBeNull();
  });

  it('metadata JSON invalide → ligne traitée comme résumé de séance dégradé, sans crash', async () => {
    const corrupt: Row = { message: 'Résumé.', metadata: '{invalid', date: '2026-06-10' };
    const result = await getLatestSessionSummary(makeDb([corrupt]), 'user-1');
    expect(result!.summary.summary).toBe('Résumé.');
    expect(result!.summary.overall_rating).toBe('average');
  });
});

describe('getStoredBlockSummary', () => {
  it('retourne la BlockSummary quand metadata.block_id correspond', async () => {
    const result = await getStoredBlockSummary(makeDb([blockSummaryRow]), 'block-1');
    expect(result).not.toBeNull();
    expect(result!.title).toBe('Bloc Hypertrophie');
    expect(result!.top_progressions).toEqual(['Bench +5kg']);
  });

  it("null si le block_id ne correspond pas ou si seul un résumé de séance existe", async () => {
    expect(await getStoredBlockSummary(makeDb([blockSummaryRow]), 'block-2')).toBeNull();
    expect(await getStoredBlockSummary(makeDb([sessionSummaryRow]), 'block-1')).toBeNull();
  });
});
