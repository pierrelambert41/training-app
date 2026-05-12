/**
 * État courant de la synchronisation push exposé par useSyncStatus.
 */
export type SyncStatus = {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  pendingCount: number;
  error: string | null;
};
