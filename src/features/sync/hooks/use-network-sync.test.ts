import { renderHook, act } from '@testing-library/react-native';
import { useNetworkSync } from './use-network-sync';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabasePushClient } from '../types/sync-service';
import type { SyncStatus } from '../types/sync-status';

// Mock @react-native-community/netinfo
const netInfoListeners: Array<(state: { isConnected: boolean }) => void> = [];

jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {
    addEventListener: jest.fn((cb: (state: { isConnected: boolean }) => void) => {
      netInfoListeners.push(cb);
      return () => {
        const idx = netInfoListeners.indexOf(cb);
        if (idx >= 0) netInfoListeners.splice(idx, 1);
      };
    }),
  },
}));

function emitNetworkEvent(isConnected: boolean) {
  netInfoListeners.forEach((cb) => cb({ isConnected }));
}

// Mock sync-service
const mockGetUnsynced = jest.fn();
const mockPush = jest.fn();

jest.mock('../api/sync-service', () => ({
  createSyncService: jest.fn(() => ({
    getUnsynced: mockGetUnsynced,
    push: mockPush,
  })),
}));

function makeDeps(pendingCount = 1) {
  const db = {} as SQLiteDatabase;
  const supabase = {} as SupabasePushClient;
  const onStatusChange = jest.fn() as jest.MockedFunction<(patch: Partial<SyncStatus>) => void>;

  mockGetUnsynced.mockResolvedValue(
    Array.from({ length: pendingCount }, (_, i) => ({ id: i + 1 }))
  );
  mockPush.mockResolvedValue({ pushed: pendingCount, failed: 0, results: [] });

  return { db, supabase, onStatusChange };
}

describe('useNetworkSync', () => {
  beforeEach(() => {
    netInfoListeners.length = 0;
    jest.clearAllMocks();
  });

  it('triggers push on initial connection (prevConnected null → true)', async () => {
    const { db, supabase, onStatusChange } = makeDeps(2);

    renderHook(() => useNetworkSync({ db, supabase, onStatusChange }));

    await act(async () => {
      emitNetworkEvent(true);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(onStatusChange).toHaveBeenCalledWith({ isSyncing: true });
    expect(onStatusChange).toHaveBeenCalledWith(
      expect.objectContaining({ isSyncing: false, lastSyncedAt: expect.any(Date) })
    );
  });

  it('triggers push on reconnection (false → true)', async () => {
    const { db, supabase, onStatusChange } = makeDeps(1);

    renderHook(() => useNetworkSync({ db, supabase, onStatusChange }));

    await act(async () => {
      emitNetworkEvent(false);
    });

    expect(mockPush).not.toHaveBeenCalled();

    await act(async () => {
      emitNetworkEvent(true);
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('does not trigger push when staying connected (true → true)', async () => {
    const { db, supabase, onStatusChange } = makeDeps(1);

    renderHook(() => useNetworkSync({ db, supabase, onStatusChange }));

    await act(async () => {
      emitNetworkEvent(true);
    });

    const callsBefore = mockPush.mock.calls.length;

    await act(async () => {
      emitNetworkEvent(true);
    });

    expect(mockPush.mock.calls.length).toBe(callsBefore);
  });

  it('does not trigger push when queue is empty', async () => {
    const { db, supabase, onStatusChange } = makeDeps(0);

    renderHook(() => useNetworkSync({ db, supabase, onStatusChange }));

    await act(async () => {
      emitNetworkEvent(true);
    });

    expect(mockPush).not.toHaveBeenCalled();
    expect(onStatusChange).not.toHaveBeenCalledWith({ isSyncing: true });
  });

  it('ignores concurrent triggers (mutex ref)', async () => {
    const { db, supabase, onStatusChange } = makeDeps(1);

    let resolvePush!: () => void;
    mockPush.mockImplementation(
      () =>
        new Promise<{ pushed: number; failed: number; results: [] }>((res) => {
          resolvePush = () => res({ pushed: 1, failed: 0, results: [] });
        })
    );

    renderHook(() => useNetworkSync({ db, supabase, onStatusChange }));

    // Premier événement : déclenche push, le push reste bloqué
    // On utilise act sans async pour ne pas vider la microtask queue
    // (le push n'est pas résolu, isSyncingRef reste true)
    await act(async () => {
      emitNetworkEvent(true);
      // Laisser la coroutine avancer jusqu'au await push (qui se bloque)
      await Promise.resolve();
      await Promise.resolve();
    });

    // À ce stade, isSyncingRef.current devrait être true
    // Deuxième tentative (offline → online) : doit être ignorée
    await act(async () => {
      emitNetworkEvent(false);
      emitNetworkEvent(true);
      await Promise.resolve();
    });

    // Résoudre le premier push
    await act(async () => {
      resolvePush();
      await Promise.resolve();
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('logs silently on push error and does not crash', async () => {
    const { db, supabase, onStatusChange } = makeDeps(1);
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockPush.mockRejectedValue(new Error('network failure'));

    renderHook(() => useNetworkSync({ db, supabase, onStatusChange }));

    await act(async () => {
      emitNetworkEvent(true);
    });

    expect(warnSpy).toHaveBeenCalledWith(
      '[sync] push() threw unexpectedly',
      expect.any(Error)
    );
    expect(onStatusChange).toHaveBeenCalledWith({ isSyncing: false });

    warnSpy.mockRestore();
  });

  it('blocks second trigger that fires before first getUnsynced resolves (race condition)', async () => {
    const { db, supabase, onStatusChange } = makeDeps(1);

    let resolveGetUnsynced!: (rows: { id: number }[]) => void;
    mockGetUnsynced.mockImplementationOnce(
      () =>
        new Promise<{ id: number }[]>((res) => {
          resolveGetUnsynced = res;
        })
    );
    mockPush.mockResolvedValue({ pushed: 1, failed: 0, results: [] });

    renderHook(() => useNetworkSync({ db, supabase, onStatusChange }));

    // Premier trigger : getUnsynced est bloqué (pas encore résolu)
    // Le mutex doit être armé AVANT ce premier await pour bloquer le second
    await act(async () => {
      emitNetworkEvent(true);
      // Laisser la coroutine avancer jusqu'au premier await (getUnsynced bloqué)
      await Promise.resolve();
    });

    // Deuxième trigger avant que getUnsynced soit résolu : doit être ignoré
    await act(async () => {
      emitNetworkEvent(false);
      emitNetworkEvent(true);
      await Promise.resolve();
    });

    // Débloquer getUnsynced
    await act(async () => {
      resolveGetUnsynced([{ id: 1 }]);
      await Promise.resolve();
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes from NetInfo on unmount', async () => {
    const { db, supabase, onStatusChange } = makeDeps(0);

    const { unmount } = renderHook(() =>
      useNetworkSync({ db, supabase, onStatusChange })
    );

    expect(netInfoListeners).toHaveLength(1);

    unmount();

    expect(netInfoListeners).toHaveLength(0);
  });
});
