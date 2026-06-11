/**
 * Tests TA-139 — Hook de lecture du résumé IA de séance (polling différé).
 *
 * Vérifie :
 * - toSessionSummaryFromRecommendation : mapping Recommendation → SessionSummary, rating invalide → 'average'
 * - findSessionSummaryRecommendation : sélectionne type 'summary' source 'ai', exclut le résumé de bloc (metadata.block_id)
 * - hook : retourne le résumé quand la Recommendation existe ; isPolling tant qu'il n'existe pas
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  findSessionSummaryRecommendation,
  toSessionSummaryFromRecommendation,
  useAISessionSummary,
} from './use-ai-session-summary';
import type { Recommendation } from '@/types';

jest.mock('@/hooks/use-db', () => ({
  useDB: jest.fn(() => ({})),
}));

const mockGetRecommendationsBySession = jest.fn();
jest.mock('@/services/recommendations', () => ({
  getRecommendationsBySession: (...args: unknown[]) =>
    mockGetRecommendationsBySession(...args),
}));

function makeRecommendation(overrides: Partial<Recommendation> = {}): Recommendation {
  return {
    id: 'rec-1',
    sessionId: 'session-1',
    exerciseId: null,
    source: 'ai',
    type: 'summary',
    message: 'Bonne séance dans l’ensemble.',
    nextLoad: null,
    nextRepTarget: null,
    nextRirTarget: null,
    action: null,
    confidence: 0.9,
    metadata: {
      overall_rating: 'good',
      highlights: ['PR squat'],
      concerns: [],
      fatigue_note: 'OK',
      next_session_note: 'Continuer.',
    },
    createdAt: '2026-06-01T10:00:00Z',
    ...overrides,
  };
}

let queryClient: QueryClient;

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
});

afterEach(() => {
  queryClient.clear();
});

describe('toSessionSummaryFromRecommendation', () => {
  it('mappe message → summary et metadata → champs structurés', () => {
    const summary = toSessionSummaryFromRecommendation(makeRecommendation());
    expect(summary.summary).toBe('Bonne séance dans l’ensemble.');
    expect(summary.overall_rating).toBe('good');
    expect(summary.highlights).toEqual(['PR squat']);
    expect(summary.concerns).toEqual([]);
    expect(summary.next_session_note).toBe('Continuer.');
  });

  it("rating invalide ou absent → 'average'", () => {
    const summary = toSessionSummaryFromRecommendation(
      makeRecommendation({ metadata: { overall_rating: 'amazing' } })
    );
    expect(summary.overall_rating).toBe('average');
    expect(summary.highlights).toEqual([]);
  });
});

describe('findSessionSummaryRecommendation', () => {
  it("sélectionne la Recommendation type 'summary' source 'ai'", () => {
    const recs = [
      makeRecommendation({ id: 'r1', type: 'load_change', source: 'rules_engine' }),
      makeRecommendation({ id: 'r2' }),
    ];
    expect(findSessionSummaryRecommendation(recs)?.id).toBe('r2');
  });

  it('exclut le résumé de bloc TA-138 (metadata.block_id)', () => {
    const blockSummary = makeRecommendation({
      id: 'r-block',
      metadata: { block_id: 'block-1', overall_assessment: 'Bon bloc' },
    });
    expect(findSessionSummaryRecommendation([blockSummary])).toBeNull();

    const sessionSummary = makeRecommendation({ id: 'r-session' });
    expect(
      findSessionSummaryRecommendation([blockSummary, sessionSummary])?.id
    ).toBe('r-session');
  });
});

describe('useAISessionSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retourne le résumé quand la Recommendation est persistée', async () => {
    mockGetRecommendationsBySession.mockResolvedValue([makeRecommendation()]);

    const { result } = renderHook(() => useAISessionSummary('session-1', true), {
      wrapper,
    });

    await waitFor(() => expect(result.current.summary).not.toBeNull());
    expect(result.current.summary?.overall_rating).toBe('good');
    expect(result.current.isPolling).toBe(false);
    expect(result.current.timedOut).toBe(false);
  });

  it("reste en isPolling tant qu'aucun résumé n'existe (fenêtre 30s)", async () => {
    mockGetRecommendationsBySession.mockResolvedValue([]);

    const { result } = renderHook(() => useAISessionSummary('session-1', true), {
      wrapper,
    });

    await waitFor(() => expect(mockGetRecommendationsBySession).toHaveBeenCalled());
    expect(result.current.summary).toBeNull();
    expect(result.current.isPolling).toBe(true);
    expect(result.current.timedOut).toBe(false);
  });

  it('ne lance pas la query quand disabled', () => {
    mockGetRecommendationsBySession.mockResolvedValue([]);

    const { result } = renderHook(() => useAISessionSummary('session-1', false), {
      wrapper,
    });

    expect(mockGetRecommendationsBySession).not.toHaveBeenCalled();
    expect(result.current.summary).toBeNull();
    expect(result.current.isPolling).toBe(false);
  });
});
