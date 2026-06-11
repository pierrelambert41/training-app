/**
 * Tests TA-139 — Bouton "Pourquoi ?" sur une recommandation (explication IA TA-136).
 *
 * Vérifie :
 * - tap → déclenche explain() et déplie l'explication
 * - second tap → replie sans nouvel appel (cache TanStack Query)
 * - état de chargement et erreur gérés
 *
 * Mock de `@/features/ai` (index de la feature), pas du hook directement — cf. pitfalls.md SYNC-01.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { RecommendationWhy } from './recommendation-why';

jest.mock('@/hooks/use-db', () => ({
  useDB: jest.fn(() => ({})),
}));

const mockExplain = jest.fn();
const mockUseExplainAdjustment = jest.fn();
jest.mock('@/features/ai', () => ({
  useExplainAdjustment: (...args: unknown[]) => mockUseExplainAdjustment(...args),
}));

describe('RecommendationWhy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseExplainAdjustment.mockReturnValue({
      explanation: null,
      isLoading: false,
      error: null,
      explain: mockExplain,
    });
  });

  it('affiche le bouton "Pourquoi ?" et déclenche explain() au tap', () => {
    const { getByText } = render(
      <RecommendationWhy recommendationId="rec-1" userId="user-1" />
    );

    fireEvent.press(getByText('Pourquoi ?'));
    expect(mockExplain).toHaveBeenCalledTimes(1);
  });

  it("affiche l'explication une fois chargée", () => {
    mockUseExplainAdjustment.mockReturnValue({
      explanation: 'Charge augmentée car RIR moyen ≥ 3 sur les deux dernières séances.',
      isLoading: false,
      error: null,
      explain: mockExplain,
    });

    const { getByText, getByTestId } = render(
      <RecommendationWhy recommendationId="rec-1" userId="user-1" />
    );

    fireEvent.press(getByText('Pourquoi ?'));
    expect(getByTestId('why-explanation-rec-1')).toBeTruthy();
    expect(
      getByText('Charge augmentée car RIR moyen ≥ 3 sur les deux dernières séances.')
    ).toBeTruthy();
    // explication déjà en cache → pas de nouvel appel
    expect(mockExplain).not.toHaveBeenCalled();
  });

  it('second tap → replie ("Masquer" → "Pourquoi ?")', () => {
    mockUseExplainAdjustment.mockReturnValue({
      explanation: 'Explication.',
      isLoading: false,
      error: null,
      explain: mockExplain,
    });

    const { getByText, queryByText } = render(
      <RecommendationWhy recommendationId="rec-1" userId="user-1" />
    );

    fireEvent.press(getByText('Pourquoi ?'));
    expect(getByText('Masquer')).toBeTruthy();
    fireEvent.press(getByText('Masquer'));
    expect(queryByText('Explication.')).toBeNull();
    expect(getByText('Pourquoi ?')).toBeTruthy();
  });

  it("affiche un message d'erreur lisible si l'explication échoue", () => {
    mockUseExplainAdjustment.mockReturnValue({
      explanation: null,
      isLoading: false,
      error: new Error('réseau'),
      explain: mockExplain,
    });

    const { getByText } = render(
      <RecommendationWhy recommendationId="rec-1" userId="user-1" />
    );

    fireEvent.press(getByText('Pourquoi ?'));
    expect(getByText('Explication indisponible pour le moment.')).toBeTruthy();
  });
});
