/**
 * Tests TA-139 — Section résumé IA de l'écran de fin de séance.
 *
 * Vérifie :
 * - skeleton affiché pendant la génération asynchrone (isPolling)
 * - résumé complet : badge rating, texte, highlights (★), concerns (⚠), note prochaine séance
 * - libellés des 4 ratings
 * - résumé minimal local si IA indisponible (timeout sans résumé persisté)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { SessionAISummary } from './session-ai-summary';
import type { SessionSummary } from '@/features/ai';

const fullSummary: SessionSummary = {
  overall_rating: 'good',
  summary: 'Très bonne séance, volume complet sur le haut du corps.',
  highlights: ['PR au développé couché : 80kg x 5', 'RIR maîtrisé sur toutes les séries'],
  concerns: ['Fatigue en fin de séance sur les triceps'],
  fatigue_note: 'Fatigue modérée.',
  next_session_note: 'Prochaine séance : augmenter le développé couché à 82.5kg.',
};

describe('SessionAISummary', () => {
  it('affiche le skeleton pendant la génération (isPolling)', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <SessionAISummary summary={null} isPolling fallbackText="Séance complétée" />
    );

    expect(getByTestId('ai-summary-skeleton')).toBeTruthy();
    expect(getByText('Génération du résumé en cours…')).toBeTruthy();
    expect(queryByTestId('ai-summary-rating-badge')).toBeNull();
    expect(queryByTestId('ai-summary-fallback')).toBeNull();
  });

  it('affiche rating, résumé, highlights, concerns et note prochaine séance', () => {
    const { getByTestId, getByText } = render(
      <SessionAISummary summary={fullSummary} isPolling={false} fallbackText="" />
    );

    expect(getByTestId('ai-summary-rating-badge')).toBeTruthy();
    expect(getByText('Bonne')).toBeTruthy();
    expect(getByText('Très bonne séance, volume complet sur le haut du corps.')).toBeTruthy();
    expect(getByTestId('ai-summary-highlights')).toBeTruthy();
    expect(getByText('PR au développé couché : 80kg x 5')).toBeTruthy();
    expect(getByTestId('ai-summary-concerns')).toBeTruthy();
    expect(getByText('Fatigue en fin de séance sur les triceps')).toBeTruthy();
    expect(getByText('Prochaine séance : augmenter le développé couché à 82.5kg.')).toBeTruthy();
  });

  it.each([
    ['excellent', 'Excellente'],
    ['good', 'Bonne'],
    ['average', 'Correcte'],
    ['poor', 'Difficile'],
  ] as Array<[SessionSummary['overall_rating'], string]>)(
    'affiche le libellé "%s" → "%s"',
    (rating, label) => {
      const { getByText } = render(
        <SessionAISummary
          summary={{ ...fullSummary, overall_rating: rating }}
          isPolling={false}
          fallbackText=""
        />
      );
      expect(getByText(label)).toBeTruthy();
    }
  );

  it("masque les listes highlights/concerns vides", () => {
    const { queryByTestId } = render(
      <SessionAISummary
        summary={{ ...fullSummary, highlights: [], concerns: [], next_session_note: '' }}
        isPolling={false}
        fallbackText=""
      />
    );
    expect(queryByTestId('ai-summary-highlights')).toBeNull();
    expect(queryByTestId('ai-summary-concerns')).toBeNull();
  });

  it('affiche le résumé minimal local si aucun résumé et polling terminé', () => {
    const { getByTestId, getByText } = render(
      <SessionAISummary
        summary={null}
        isPolling={false}
        fallbackText="Séance complétée — 12 séries, 4 exercices."
      />
    );
    expect(getByTestId('ai-summary-fallback')).toBeTruthy();
    expect(getByText('Séance complétée — 12 séries, 4 exercices.')).toBeTruthy();
  });
});
