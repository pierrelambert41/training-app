import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { colors } from '@/theme/tokens';
import { useSyncStore } from '../stores/sync-store';
import { useNetworkStatus } from '../hooks/use-network-status';
import { SyncStatusIndicator } from './sync-status-indicator';

function formatLastSyncedAt(date: Date | null): string {
  if (!date) return 'Jamais synchronisé';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `Il y a ${diffH}h`;
  return date.toLocaleDateString('fr-FR');
}

function statusLabel(isSyncing: boolean, pendingCount: number, error: string | null): string {
  if (isSyncing) return 'Synchronisation en cours…';
  if (error) return 'Erreur de synchronisation';
  if (pendingCount > 0) return `${pendingCount} élément${pendingCount > 1 ? 's' : ''} en attente`;
  return 'Synchronisé';
}

/**
 * Section "Synchronisation" à intégrer dans l'écran Profil.
 *
 * Lit directement le store Zustand de sync — pas besoin de props.
 * Bouton "Synchroniser maintenant" désactivé si isSyncing ou réseau absent.
 *
 * Skill utilisé : expo:building-native-ui
 * — zones tactiles min 44×44 (h-tap = 44px)
 * — dark mode NativeWind
 * — animation légère (ActivityIndicator natif)
 */
export function SyncStatusSection() {
  const isSyncing = useSyncStore((s) => s.isSyncing);
  const pendingCount = useSyncStore((s) => s.pendingCount);
  const error = useSyncStore((s) => s.error);
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt);
  const triggerPush = useSyncStore((s) => s.triggerPush);
  const { isOffline } = useNetworkStatus();

  const isButtonDisabled = isSyncing || isOffline;

  return (
    <View
      testID="sync-status-section"
      className="bg-background-surface border border-border rounded-card p-4 gap-3"
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-label text-content-primary font-semibold">Synchronisation</Text>
        <SyncStatusIndicator
          isSyncing={isSyncing}
          pendingCount={pendingCount}
          error={error}
        />
      </View>

      <View className="gap-1">
        <Text
          testID="sync-status-label"
          className={`text-body ${error ? 'text-status-danger' : 'text-content-secondary'}`}
        >
          {statusLabel(isSyncing, pendingCount, error)}
        </Text>
        <Text className="text-caption text-content-muted">
          {formatLastSyncedAt(lastSyncedAt)}
        </Text>
      </View>

      <Pressable
        testID="sync-manual-button"
        onPress={() => triggerPush()}
        disabled={isButtonDisabled}
        className="bg-background-elevated border border-border rounded-button h-tap items-center justify-center disabled:opacity-40"
      >
        {isSyncing ? (
          <ActivityIndicator size="small" color={colors.contentSecondary} />
        ) : (
          <Text className="text-body text-content-primary font-semibold">
            {isOffline ? 'Hors-ligne' : 'Synchroniser maintenant'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
