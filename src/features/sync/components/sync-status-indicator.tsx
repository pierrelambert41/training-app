import { View, Text, ActivityIndicator } from 'react-native';
import { colors } from '@/theme/tokens';

type SyncStatusIndicatorProps = {
  isSyncing: boolean;
  pendingCount: number;
  error: string | null;
};

/**
 * Indicateur compact de statut de synchronisation.
 *
 * Règles d'affichage (skill expo:building-native-ui) :
 * - Synced (pendingCount=0, !isSyncing, !error) → rien affiché (discret)
 * - Syncing → spinner ActivityIndicator léger
 * - Pending → badge rouge avec le nombre d'éléments en attente
 * - Error → icône alerte (•) en rouge
 *
 * Conçu pour être placé dans un header ou à côté d'un titre de section.
 */
export function SyncStatusIndicator({ isSyncing, pendingCount, error }: SyncStatusIndicatorProps) {
  if (isSyncing) {
    return (
      <View testID="sync-indicator-syncing" className="w-5 h-5 items-center justify-center">
        <ActivityIndicator size="small" color={colors.contentSecondary} />
      </View>
    );
  }

  if (error) {
    return (
      <View
        testID="sync-indicator-error"
        className="w-5 h-5 rounded-chip bg-status-danger items-center justify-center"
      >
        <Text className="text-caption text-content-on-accent font-semibold leading-none">!</Text>
      </View>
    );
  }

  if (pendingCount > 0) {
    return (
      <View
        testID="sync-indicator-pending"
        className="min-w-5 h-5 px-1 rounded-chip bg-status-danger items-center justify-center"
      >
        <Text className="text-caption text-content-on-accent font-semibold leading-none">
          {pendingCount > 99 ? '99+' : String(pendingCount)}
        </Text>
      </View>
    );
  }

  return null;
}
