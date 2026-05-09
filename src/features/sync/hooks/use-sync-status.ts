import { useState, useCallback, useEffect, useRef } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabasePushClient } from '../types/sync-service';
import type { SyncStatus } from '../types/sync-status';
import { useNetworkSync } from './use-network-sync';
import { createSyncService } from '../api/sync-service';

/**
 * Hook racine à monter une seule fois dans le root layout.
 * Orchestre useNetworkSync et expose l'état de sync courant.
 *
 * - isSyncing : true pendant l'exécution de push()
 * - lastSyncedAt : date du dernier push() terminé avec succès
 * - pendingCount : nombre d'entrées non synced après le dernier push()
 *
 * pendingCount est initialisé au montage (getUnsynced) et actualisé après
 * chaque push(). Il ne reflète pas les enfilages temps-réel pendant le push —
 * ceux-ci seront comptabilisés lors du prochain cycle.
 */
export function useSyncStatus(db: SQLiteDatabase, supabase: SupabasePushClient): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    lastSyncedAt: null,
    pendingCount: 0,
  });

  const syncService = useRef(createSyncService({ supabase }));

  const handleStatusChange = useCallback((patch: Partial<SyncStatus>) => {
    setStatus((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    syncService.current
      .getUnsynced(db)
      .then((rows) => {
        setStatus((prev) => ({ ...prev, pendingCount: rows.length }));
      })
      .catch(() => {});
  }, [db]);

  useNetworkSync({ db, supabase, onStatusChange: handleStatusChange, syncService: syncService.current });

  return status;
}
