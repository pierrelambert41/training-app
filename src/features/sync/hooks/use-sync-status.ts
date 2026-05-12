import { useCallback, useEffect, useRef } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabasePushClient } from '../types/sync-service';
import type { SyncStatus } from '../types/sync-status';
import { useNetworkSync } from './use-network-sync';
import { createSyncService } from '../api/sync-service';
import { useSyncStore } from '../stores/sync-store';

/**
 * Hook racine à monter une seule fois dans le root layout (via SyncBridge).
 * Orchestre useNetworkSync, expose l'état de sync via le store Zustand global,
 * et enregistre la fonction de push manuel dans le store.
 *
 * - isSyncing : true pendant l'exécution de push()
 * - lastSyncedAt : date du dernier push() terminé avec succès
 * - pendingCount : nombre d'entrées non synced après le dernier push()
 * - error : message d'erreur si le dernier push() a échoué totalement
 *
 * pendingCount est initialisé au montage (getUnsynced) et actualisé après
 * chaque push(). Il ne reflète pas les enfilages temps-réel pendant le push —
 * ceux-ci seront comptabilisés lors du prochain cycle.
 */
export function useSyncStatus(db: SQLiteDatabase, supabase: SupabasePushClient): SyncStatus {
  const patchStatus = useSyncStore((s) => s.patchStatus);
  const registerPush = useSyncStore((s) => s.registerPush);

  const syncService = useRef(createSyncService({ supabase }));

  const handleStatusChange = useCallback((patch: Partial<SyncStatus>) => {
    patchStatus(patch);
  }, [patchStatus]);

  useEffect(() => {
    syncService.current
      .getUnsynced(db)
      .then((rows) => {
        patchStatus({ pendingCount: rows.length, error: null });
      })
      .catch(() => {});
  }, [db, patchStatus]);

  const manualPush = useCallback(async () => {
    const isSyncing = useSyncStore.getState().isSyncing;
    if (isSyncing) return;

    patchStatus({ isSyncing: true, error: null });
    try {
      const result = await syncService.current.push(db);
      const remaining = await syncService.current.getUnsynced(db).catch(() => []);
      const errorMsg = result.failed > 0
        ? `${result.failed} élément(s) non synchronisé(s)`
        : null;
      patchStatus({
        isSyncing: false,
        lastSyncedAt: new Date(),
        pendingCount: remaining.length,
        error: errorMsg,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur de synchronisation';
      patchStatus({ isSyncing: false, error: message });
    }
  }, [db, patchStatus]);

  useEffect(() => {
    registerPush(manualPush);
    return () => registerPush(null);
  }, [manualPush, registerPush]);

  useNetworkSync({ db, supabase, onStatusChange: handleStatusChange, syncService: syncService.current });

  const status = useSyncStore.getState();
  return {
    isSyncing: status.isSyncing,
    lastSyncedAt: status.lastSyncedAt,
    pendingCount: status.pendingCount,
    error: status.error,
  };
}
