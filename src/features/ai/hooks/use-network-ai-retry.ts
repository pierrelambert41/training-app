import { useCallback, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { processPendingAICalls } from '../api/ai-queue-service';

type NetworkAIRetryDeps = {
  db: SQLiteDatabase;
  supabase: SupabaseClient;
  userId: string | undefined;
};

/**
 * Écoute les événements réseau et déclenche processPendingAICalls dès que
 * isConnected passe de false à true (et au montage si déjà connecté) —
 * même pattern que useNetworkSync (TA-121), indépendant de la SyncQueue Supabase.
 *
 * Mutex ref : un cycle en cours bloque tout nouveau déclencheur.
 * Erreurs silencieuses (console.warn) : retry au prochain événement réseau.
 */
export function useNetworkAIRetry({ db, supabase, userId }: NetworkAIRetryDeps): void {
  const isProcessingRef = useRef(false);

  const triggerProcess = useCallback(async () => {
    if (!userId || isProcessingRef.current) return;
    isProcessingRef.current = true;
    try {
      await processPendingAICalls(db, userId, supabase);
    } catch (err) {
      console.warn('[ai-queue] processPendingAICalls threw unexpectedly', err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [db, supabase, userId]);

  useEffect(() => {
    let prevConnected: boolean | null = null;

    const unsubscribe = NetInfo.addEventListener((state) => {
      const isConnected = state.isConnected ?? false;

      if (isConnected && (prevConnected === false || prevConnected === null)) {
        triggerProcess().catch(() => {});
      }

      prevConnected = isConnected;
    });

    return unsubscribe;
  }, [triggerProcess]);
}
