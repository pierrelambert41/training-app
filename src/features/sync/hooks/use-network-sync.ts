import { useEffect, useRef, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { SQLiteDatabase } from 'expo-sqlite';
import { createSyncService } from '../api/sync-service';
import type { SupabasePushClient } from '../types/sync-service';
import type { SyncStatus } from '../types/sync-status';

type SyncServiceInstance = ReturnType<typeof createSyncService>;

type NetworkSyncDeps = {
  db: SQLiteDatabase;
  supabase: SupabasePushClient;
  onStatusChange: (patch: Partial<SyncStatus>) => void;
  syncService?: SyncServiceInstance;
};

/**
 * Écoute les événements réseau et déclenche un push() dès que isConnected
 * passe de false à true (retour réseau). Déclenche également un push() au
 * montage si la connexion est déjà disponible et que la queue n'est pas vide.
 *
 * Garanties :
 * - Mutex ref : un push en cours bloque tout nouveau déclencheur (pas de
 *   double-push, absorbe le double-mount de React Strict Mode).
 * - Erreurs réseau silencieuses : capturées en console.warn, retryées au
 *   prochain événement réseau.
 * - Stable deps : la fonction triggerPush est mémorisée via useCallback pour
 *   éviter les re-subscriptions inutiles à NetInfo.
 */
export function useNetworkSync({ db, supabase, onStatusChange, syncService: externalService }: NetworkSyncDeps): void {
  const isSyncingRef = useRef(false);
  const internalService = useRef(createSyncService({ supabase }));
  const resolvedServiceRef = useRef(externalService ?? internalService.current);

  const triggerPush = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      const unsynced = await resolvedServiceRef.current.getUnsynced(db).catch(() => []);
      if (unsynced.length === 0) return;

      onStatusChange({ isSyncing: true });

      await resolvedServiceRef.current.push(db);
      const remaining = await resolvedServiceRef.current.getUnsynced(db).catch(() => []);
      onStatusChange({
        isSyncing: false,
        lastSyncedAt: new Date(),
        pendingCount: remaining.length,
      });
    } catch (err) {
      console.warn('[sync] push() threw unexpectedly', err);
      onStatusChange({ isSyncing: false });
    } finally {
      isSyncingRef.current = false;
    }
  }, [db, onStatusChange]);

  useEffect(() => {
    let prevConnected: boolean | null = null;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? false;

      if (isConnected && prevConnected === false) {
        triggerPush().catch(() => {});
      }

      if (prevConnected === null && isConnected) {
        triggerPush().catch(() => {});
      }

      prevConnected = isConnected;
    });

    return unsubscribe;
  }, [triggerPush]);
}
