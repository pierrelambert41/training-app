/**
 * Tests TA-134 — useAIContextRefresh
 *
 * Vérifie :
 * - refreshAIContextProfile est appelé avec db et userId
 * - si un refresh est en cours, le suivant est ignoré (guard)
 * - une erreur est loguée en console uniquement, ne propage pas
 * - si EXPO_PUBLIC_AI_ENABLED=false, rien n'est appelé
 */

import { renderHook, act } from '@testing-library/react-native';
import type { SQLiteDatabase } from 'expo-sqlite';

const mockRefreshAIContextProfile = jest.fn(async () => ({
  version: 1,
  user: {},
  morphology: {},
  exercise_preferences: {},
  performance_baselines: {},
  recent_highlights: [],
  coaching_style: 'direct',
  parallel_sports: [],
}));

jest.mock('@/features/ai', () => ({
  refreshAIContextProfile: (...args: unknown[]) =>
    mockRefreshAIContextProfile(...args),
}));

import { useAIContextRefresh } from './use-ai-context-refresh';

const mockDb = {} as SQLiteDatabase;

describe('useAIContextRefresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset env var to default (enabled)
    process.env.EXPO_PUBLIC_AI_ENABLED = undefined;
  });

  afterEach(() => {
    process.env.EXPO_PUBLIC_AI_ENABLED = undefined;
  });

  it('appelle refreshAIContextProfile avec db et userId', async () => {
    const { result } = renderHook(() => useAIContextRefresh(mockDb));

    act(() => {
      result.current.triggerAIContextRefresh('user-1');
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRefreshAIContextProfile).toHaveBeenCalledTimes(1);
    expect(mockRefreshAIContextProfile).toHaveBeenCalledWith(mockDb, 'user-1');
  });

  it('ignore un second appel si un refresh est déjà en cours', async () => {
    let resolveFirst!: () => void;
    mockRefreshAIContextProfile.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveFirst = resolve;
        }) as unknown as ReturnType<typeof mockRefreshAIContextProfile>
    );

    const { result } = renderHook(() => useAIContextRefresh(mockDb));

    act(() => {
      result.current.triggerAIContextRefresh('user-1');
      result.current.triggerAIContextRefresh('user-1');
    });

    resolveFirst();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockRefreshAIContextProfile).toHaveBeenCalledTimes(1);
  });

  it("logue l'erreur en console sans la propager", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRefreshAIContextProfile.mockRejectedValueOnce(new Error('network error'));

    const { result } = renderHook(() => useAIContextRefresh(mockDb));

    act(() => {
      result.current.triggerAIContextRefresh('user-1');
    });

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[ai] refreshAIContextProfile failed',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('reset le flag si refreshAIContextProfile throw synchrone, permettant un re-déclenchement', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockRefreshAIContextProfile.mockImplementationOnce(() => {
      throw new Error('sync throw');
    });

    const { result } = renderHook(() => useAIContextRefresh(mockDb));

    act(() => {
      result.current.triggerAIContextRefresh('user-1');
    });

    // Le flag doit être resetté immédiatement après le throw synchrone
    // Un second appel doit donc passer (flag non bloqué)
    mockRefreshAIContextProfile.mockResolvedValueOnce({
      version: 1,
      user: {},
      morphology: {},
      exercise_preferences: {},
      performance_baselines: {},
      recent_highlights: [],
      coaching_style: 'direct',
      parallel_sports: [],
    } as unknown as Awaited<ReturnType<typeof mockRefreshAIContextProfile>>);

    act(() => {
      result.current.triggerAIContextRefresh('user-1');
    });

    await act(async () => {
      await Promise.resolve();
    });

    // Premier appel throw sync + second appel qui passe = 2 appels au total
    expect(mockRefreshAIContextProfile).toHaveBeenCalledTimes(2);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ai] refreshAIContextProfile failed',
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("ne lance pas refreshAIContextProfile si EXPO_PUBLIC_AI_ENABLED=false", () => {
    process.env.EXPO_PUBLIC_AI_ENABLED = 'false';

    const { result } = renderHook(() => useAIContextRefresh(mockDb));

    act(() => {
      result.current.triggerAIContextRefresh('user-1');
    });

    expect(mockRefreshAIContextProfile).not.toHaveBeenCalled();

    delete process.env.EXPO_PUBLIC_AI_ENABLED;
  });
});
