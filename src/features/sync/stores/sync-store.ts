import { create } from 'zustand';
import type { SyncStatus } from '../types/sync-status';

type ManualPushFn = (() => Promise<void>) | null;

type SyncStoreState = SyncStatus & {
  /**
   * Ref vers la fonction de push manuel injectée par SyncBridge au montage.
   * null avant que SyncBridge soit monté (rare mais possible au tout début).
   */
  _triggerPush: ManualPushFn;
};

type SyncStoreActions = {
  patchStatus: (patch: Partial<SyncStatus>) => void;
  registerPush: (fn: ManualPushFn) => void;
  triggerPush: () => Promise<void>;
};

export type SyncStore = SyncStoreState & SyncStoreActions;

export const useSyncStore = create<SyncStore>((set, get) => ({
  isSyncing: false,
  lastSyncedAt: null,
  pendingCount: 0,
  error: null,
  _triggerPush: null,

  patchStatus: (patch) => set((prev) => ({ ...prev, ...patch })),

  registerPush: (fn) => set({ _triggerPush: fn }),

  triggerPush: async () => {
    const fn = get()._triggerPush;
    if (fn) {
      await fn();
    }
  },
}));
