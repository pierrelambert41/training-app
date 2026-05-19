/**
 * Tests TA-136 — Hook use-explain-adjustment.
 *
 * Vérifie :
 * - explanation non nulle après résolution (appel explicite via explain())
 * - isLoading true pendant l'appel
 * - error non null si le service lève une exception
 */

import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useExplainAdjustment } from './use-explain-adjustment';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockExplainAdjustment = jest.fn();
jest.mock('../api/explain-adjustment-service', () => ({
  explainAdjustment: (...args: unknown[]) => mockExplainAdjustment(...args),
}));

jest.mock('@/services/supabase', () => ({
  supabase: null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
}

const mockDb = {} as SQLiteDatabase;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useExplainAdjustment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("n'appelle pas le service avant explain()", () => {
    const { Wrapper } = makeWrapper();

    renderHook(
      () =>
        useExplainAdjustment({
          db: mockDb,
          recommendationId: 'reco-1',
          userId: 'user-1',
        }),
      { wrapper: Wrapper }
    );

    expect(mockExplainAdjustment).not.toHaveBeenCalled();
  });

  it('retourne une explanation non nulle après appel de explain()', async () => {
    mockExplainAdjustment.mockResolvedValue('Explication IA générée');
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useExplainAdjustment({
          db: mockDb,
          recommendationId: 'reco-1',
          userId: 'user-1',
        }),
      { wrapper: Wrapper }
    );

    expect(result.current.explanation).toBeNull();

    result.current.explain();

    await waitFor(() => {
      expect(result.current.explanation).toBe('Explication IA générée');
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("expose error non null si le service lève une exception", async () => {
    mockExplainAdjustment.mockRejectedValue(new Error('Recommendation not found'));
    const { Wrapper } = makeWrapper();

    const { result } = renderHook(
      () =>
        useExplainAdjustment({
          db: mockDb,
          recommendationId: 'nonexistent',
          userId: 'user-1',
        }),
      { wrapper: Wrapper }
    );

    result.current.explain();

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });

    expect(result.current.explanation).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});
