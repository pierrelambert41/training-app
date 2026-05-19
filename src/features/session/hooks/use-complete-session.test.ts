/**
 * Tests TA-134 / TA-135 — Auto-refresh AIContextProfile et session summary après complétion de séance.
 *
 * Vérifie :
 * - triggerAIContextRefresh est appelé après runRulesEngine réussi
 * - triggerSessionSummary(sessionId, userId) est appelé après runRulesEngine réussi
 * - une erreur dans runRulesEngine ne propage pas et ne déclenche pas le refresh ni le summary
 * - une erreur dans refreshAIContextProfile ne propage pas vers l'UI
 * - sans userId, le refresh n'est pas déclenché
 */

import { renderHook, act } from '@testing-library/react-native';

// --- Mocks -----------------------------------------------------------------

jest.mock('@/hooks/use-db', () => ({
  useDB: jest.fn(() => ({})),
}));

jest.mock('@/stores/session-store', () => ({
  useSessionStore: jest.fn((selector: (s: unknown) => unknown) =>
    selector({
      completeSession: jest.fn(async () => {}),
      updateSessionNotes: jest.fn(),
      session: { id: 'session-1', postSessionNotes: null, preSessionNotes: null },
    })
  ),
}));

const mockRunRulesEngine = jest.fn(async () => ({
  recommendations: [],
  sessionPlan: {},
  fatigueScore: 5,
  plateauAlerts: [],
  deloadTriggered: false,
  deloadDecision: null,
  sessionScores: { completion_score: 1, performance_score: 8, fatigue_score: 5 },
}));
jest.mock('@/features/progression', () => ({
  runRulesEngine: (...args: unknown[]) => mockRunRulesEngine(...args),
}));

const mockInvalidateQueries = jest.fn(async () => {});
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: jest.fn(() => ({
    invalidateQueries: mockInvalidateQueries,
  })),
}));

const mockTriggerAIContextRefresh = jest.fn();
jest.mock('@/hooks/use-ai-context-refresh', () => ({
  useAIContextRefresh: jest.fn(() => ({
    triggerAIContextRefresh: mockTriggerAIContextRefresh,
  })),
}));

const mockTriggerSessionSummary = jest.fn();
jest.mock('@/hooks/use-session-summary-trigger', () => ({
  useSessionSummaryTrigger: jest.fn(() => ({
    triggerSessionSummary: mockTriggerSessionSummary,
  })),
}));

// --- Import après mocks ----------------------------------------------------

import { useCompleteSession } from './use-complete-session';

// ---------------------------------------------------------------------------

describe('useCompleteSession — AI context refresh + session summary (TA-134 / TA-135)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRunRulesEngine.mockResolvedValue({
      recommendations: [],
      sessionPlan: {},
      fatigueScore: 5,
      plateauAlerts: [],
      deloadTriggered: false,
      deloadDecision: null,
      sessionScores: { completion_score: 1, performance_score: 8, fatigue_score: 5 },
    });
  });

  it('appelle triggerAIContextRefresh après runRulesEngine réussi', async () => {
    const { result } = renderHook(() => useCompleteSession('user-1'));

    await act(async () => {
      await result.current.complete('session-1', null, '');
    });

    expect(mockTriggerAIContextRefresh).toHaveBeenCalledTimes(1);
    expect(mockTriggerAIContextRefresh).toHaveBeenCalledWith('user-1');
  });

  it('appelle triggerSessionSummary(sessionId, userId) après runRulesEngine réussi', async () => {
    const { result } = renderHook(() => useCompleteSession('user-1'));

    await act(async () => {
      await result.current.complete('session-1', null, '');
    });

    expect(mockTriggerSessionSummary).toHaveBeenCalledTimes(1);
    expect(mockTriggerSessionSummary).toHaveBeenCalledWith('session-1', 'user-1');
  });

  it("ne déclenche pas le refresh si runRulesEngine échoue", async () => {
    mockRunRulesEngine.mockRejectedValueOnce(new Error('rules engine crash'));

    const { result } = renderHook(() => useCompleteSession('user-1'));

    await act(async () => {
      await result.current.complete('session-1', null, '');
    });

    expect(mockTriggerAIContextRefresh).not.toHaveBeenCalled();
  });

  it("ne déclenche pas triggerSessionSummary si runRulesEngine échoue", async () => {
    mockRunRulesEngine.mockRejectedValueOnce(new Error('rules engine crash'));

    const { result } = renderHook(() => useCompleteSession('user-1'));

    await act(async () => {
      await result.current.complete('session-1', null, '');
    });

    expect(mockTriggerSessionSummary).not.toHaveBeenCalled();
  });

  it("ne déclenche pas le refresh si userId est undefined", async () => {
    const { result } = renderHook(() => useCompleteSession(undefined));

    await act(async () => {
      await result.current.complete('session-1', null, '');
    });

    expect(mockTriggerAIContextRefresh).not.toHaveBeenCalled();
  });

  it("une erreur synchrone dans triggerAIContextRefresh ne propage pas vers l'UI", async () => {
    mockTriggerAIContextRefresh.mockImplementationOnce(() => {
      throw new Error('refresh failed synchronously');
    });

    const { result } = renderHook(() => useCompleteSession('user-1'));

    await expect(
      act(async () => {
        await result.current.complete('session-1', null, '');
      })
    ).resolves.not.toThrow();
  });
});
