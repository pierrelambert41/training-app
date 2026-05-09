import { useDB } from '@/hooks/use-db';
import type { SupabasePushClient } from '../types/sync-service';
import { useSyncStatus } from '../hooks/use-sync-status';

type SyncBridgeProps = {
  supabase: SupabasePushClient;
};

/**
 * Composant sans UI à monter une seule fois dans le root layout (sous DBProvider).
 * Active le déclenchement automatique de SyncService.push() au retour réseau
 * et au démarrage de l'app.
 *
 * Le client Supabase est injecté depuis le root layout pour éviter que ce
 * composant importe @/services/supabase directement (non mocké dans Jest).
 * Le cast `as unknown as SupabasePushClient` est fait côté appelant (app/_layout.tsx).
 *
 * Doit être monté APRÈS DBProvider (besoin du contexte SQLite). Dans RootLayout,
 * l'ordre d'imbrication garantit cela.
 */
export function SyncBridge({ supabase }: SyncBridgeProps) {
  const db = useDB();
  useSyncStatus(db, supabase);
  return null;
}
