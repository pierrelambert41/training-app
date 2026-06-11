import type { SupabaseClient } from '@supabase/supabase-js';
import { useDB } from '@/hooks/use-db';
import { useAuthStore } from '@/features/auth';
import { useNetworkAIRetry } from '../hooks/use-network-ai-retry';

type AIQueueBridgeProps = {
  supabase: SupabaseClient;
};

/**
 * Composant sans UI à monter une seule fois dans le root layout (sous DBProvider),
 * à côté de SyncBridge. Active le traitement de la queue de retry IA (TA-141)
 * au retour réseau et au démarrage.
 *
 * Le client Supabase est injecté depuis le root layout (même raison que SyncBridge :
 * éviter l'import direct de @/services/supabase, non mocké dans Jest).
 */
export function AIQueueBridge({ supabase }: AIQueueBridgeProps) {
  const db = useDB();
  const userId = useAuthStore((s) => s.user?.id);
  useNetworkAIRetry({ db, supabase, userId });
  return null;
}
