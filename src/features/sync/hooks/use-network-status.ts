import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Retourne true si le réseau est absent.
 * S'appuie sur NetInfo (déjà utilisé par useNetworkSync) — pas de double
 * souscription grâce au cache interne de NetInfo.
 */
export function useNetworkStatus(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected ?? false));
    });
    return unsubscribe;
  }, []);

  return { isOffline };
}
