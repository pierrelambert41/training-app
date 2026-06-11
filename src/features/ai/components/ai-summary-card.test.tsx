/**
 * Tests TA-140 — AISummaryCard (SessionSummary | BlockSummary).
 *
 * Vérifie :
 * - type 'session' : rating + texte + highlights condensés affichés
 * - type 'block' : titre, overall_assessment, top_progressions, compliance_note ; pas de badge rating
 * - summary null → rien rendu (pas de placeholder)
 * - texte long → toggle "Voir plus" / "Voir moins" ; texte court → pas de toggle
 * - highlights condensés à 2 max
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { AISummaryCard } from './ai-summary-card';
import type { BlockSummary, SessionSummary } from '../types/ai-responses';

const sessionSummary: SessionSummary = {
  overall_rating: 'excellent',
  summary: 'Très bonne séance push.',
  highlights: ['PR bench 80kg', 'Volume complet épaules', 'RIR maîtrisé'],
  concerns: [],
  fatigue_note: '',
  next_session_note: '',
};

const blockSummary: BlockSummary = {
  title: 'Bloc Hypertrophie',
  duration_weeks: 6,
  overall_assessment: 'Bon bloc avec progression régulière sur les mouvements principaux.',
  top_progressions: ['Bench +5kg e1RM'],
  stagnations: [],
  compliance_note: 'Taux de complétion 87%.',
  next_block_recommendation: 'Augmenter le volume squat.',
};

describe('AISummaryCard', () => {
  it("type 'session' : affiche rating, texte et highlights condensés", () => {
    const { getByTestId, getByText } = render(
      <AISummaryCard type="session" summary={sessionSummary} />
    );

    expect(getByTestId('ai-summary-card')).toBeTruthy();
    expect(getByTestId('ai-summary-card-rating')).toBeTruthy();
    expect(getByText('Excellente')).toBeTruthy();
    expect(getByText('Très bonne séance push.')).toBeTruthy();
    expect(getByText('PR bench 80kg')).toBeTruthy();
  });

  it('condense les highlights à 2 max', () => {
    const { getByText, queryByText } = render(
      <AISummaryCard type="session" summary={sessionSummary} />
    );
    expect(getByText('PR bench 80kg')).toBeTruthy();
    expect(getByText('Volume complet épaules')).toBeTruthy();
    expect(queryByText('RIR maîtrisé')).toBeNull();
  });

  it("type 'block' : affiche titre, bilan, progressions et compliance ; pas de rating", () => {
    const { getByText, queryByTestId } = render(
      <AISummaryCard type="block" summary={blockSummary} />
    );

    expect(getByText('BLOC HYPERTROPHIE')).toBeTruthy();
    expect(
      getByText('Bon bloc avec progression régulière sur les mouvements principaux.')
    ).toBeTruthy();
    expect(getByText('Bench +5kg e1RM')).toBeTruthy();
    expect(getByText('Taux de complétion 87%.')).toBeTruthy();
    expect(queryByTestId('ai-summary-card-rating')).toBeNull();
  });

  it('summary null → rien rendu', () => {
    const { queryByTestId } = render(<AISummaryCard type="session" summary={null} />);
    expect(queryByTestId('ai-summary-card')).toBeNull();
  });

  it('texte court → pas de toggle Voir plus', () => {
    const { queryByTestId } = render(
      <AISummaryCard type="session" summary={sessionSummary} />
    );
    expect(queryByTestId('ai-summary-card-toggle')).toBeNull();
  });

  it('texte long → toggle Voir plus / Voir moins', () => {
    const longSummary: SessionSummary = {
      ...sessionSummary,
      summary:
        'Séance très complète avec un excellent volume sur le haut du corps, une progression notable sur le développé couché et une gestion du RIR exemplaire sur toutes les séries de la séance.',
    };
    const { getByTestId, getByText } = render(
      <AISummaryCard type="session" summary={longSummary} />
    );

    const toggle = getByTestId('ai-summary-card-toggle');
    expect(getByText('Voir plus')).toBeTruthy();
    fireEvent.press(toggle);
    expect(getByText('Voir moins')).toBeTruthy();
  });
});
