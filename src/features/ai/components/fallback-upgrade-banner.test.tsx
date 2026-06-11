/**
 * Tests TA-146 — FallbackUpgradeBanner.
 *
 * Vérifie :
 * - rendue si programme fallback + réseau dispo ; rien si source 'ai', offline ou dismissed
 * - croix → dismiss (store) → bannière masquée
 * - "Mettre à jour" → upgradeFallbackProgramToAI + invalidation de la query active-program
 * - échec → message non-bloquant, bannière toujours visible
 * - "Pourquoi ?" → explication dépliée
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { FallbackUpgradeBanner } from './fallback-upgrade-banner';
import { useUpgradeBannerStore } from '../stores/upgrade-banner-store';
import type { Program } from '@/types';

jest.mock('@/hooks/use-db', () => ({
  useDB: jest.fn(() => ({})),
}));

jest.mock('@/services/supabase', () => ({
  supabase: {},
}));

const mockUseNetworkStatus = jest.fn();
jest.mock('@/features/sync', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}));

const mockInvalidateQueries = jest.fn(async () => {});
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

const mockUpgrade = jest.fn();
jest.mock('../api/upgrade-program-service', () => ({
  upgradeFallbackProgramToAI: (...args: unknown[]) => mockUpgrade(...args),
}));

function makeProgram(source: Program['generationSource']): Program {
  return {
    id: 'program-1',
    userId: 'user-1',
    title: 'Hypertrophie',
    goal: 'hypertrophy',
    frequency: 3,
    level: 'intermediate',
    isActive: true,
    generationSource: source,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
  };
}

describe('FallbackUpgradeBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNetworkStatus.mockReturnValue({ isOffline: false });
    useUpgradeBannerStore.setState({ dismissed: false });
    mockUpgrade.mockResolvedValue(undefined);
  });

  it('rendue pour un programme fallback avec réseau', () => {
    const { getByTestId, getByText } = render(
      <FallbackUpgradeBanner program={makeProgram('fallback')} userId="user-1" />
    );
    expect(getByTestId('fallback-upgrade-banner')).toBeTruthy();
    expect(getByText('✦ Programme amélioré disponible')).toBeTruthy();
    expect(getByText('Mettre à jour')).toBeTruthy();
  });

  it("rien si le programme est déjà 'ai'", () => {
    const { queryByTestId } = render(
      <FallbackUpgradeBanner program={makeProgram('ai')} userId="user-1" />
    );
    expect(queryByTestId('fallback-upgrade-banner')).toBeNull();
  });

  it('rien hors-ligne', () => {
    mockUseNetworkStatus.mockReturnValue({ isOffline: true });
    const { queryByTestId } = render(
      <FallbackUpgradeBanner program={makeProgram('fallback')} userId="user-1" />
    );
    expect(queryByTestId('fallback-upgrade-banner')).toBeNull();
  });

  it('croix → dismissée (jusqu\'au prochain démarrage)', () => {
    const { getByTestId, queryByTestId } = render(
      <FallbackUpgradeBanner program={makeProgram('fallback')} userId="user-1" />
    );

    fireEvent.press(getByTestId('upgrade-banner-dismiss'));

    expect(useUpgradeBannerStore.getState().dismissed).toBe(true);
    expect(queryByTestId('fallback-upgrade-banner')).toBeNull();
  });

  it('Mettre à jour → upgrade + invalidation active-program', async () => {
    const { getByTestId } = render(
      <FallbackUpgradeBanner program={makeProgram('fallback')} userId="user-1" />
    );

    fireEvent.press(getByTestId('upgrade-banner-cta'));

    await waitFor(() => expect(mockUpgrade).toHaveBeenCalled());
    expect(mockUpgrade).toHaveBeenCalledWith(expect.anything(), 'program-1', 'user-1', expect.anything());
    await waitFor(() =>
      expect(mockInvalidateQueries).toHaveBeenCalledWith({ queryKey: ['active-program', 'user-1'] })
    );
  });

  it('échec → message non-bloquant, bannière toujours visible', async () => {
    mockUpgrade.mockRejectedValue(new Error('timeout'));
    const { getByTestId, getByText } = render(
      <FallbackUpgradeBanner program={makeProgram('fallback')} userId="user-1" />
    );

    fireEvent.press(getByTestId('upgrade-banner-cta'));

    await waitFor(() => expect(getByTestId('upgrade-banner-error')).toBeTruthy());
    expect(getByText("Impossible de générer pour l'instant, réessayez plus tard.")).toBeTruthy();
    expect(getByTestId('fallback-upgrade-banner')).toBeTruthy();
    expect(getByTestId('upgrade-banner-cta')).toBeTruthy();
  });

  it('Pourquoi ? → explication dépliée', () => {
    const { getByTestId, queryByTestId } = render(
      <FallbackUpgradeBanner program={makeProgram('fallback')} userId="user-1" />
    );

    expect(queryByTestId('upgrade-banner-why-text')).toBeNull();
    fireEvent.press(getByTestId('upgrade-banner-why'));
    expect(getByTestId('upgrade-banner-why-text')).toBeTruthy();
  });
});
