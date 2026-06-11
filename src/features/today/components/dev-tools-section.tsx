import { View } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { AppText, Button } from '@/components/ui';
import { useDevTools } from '../hooks/use-dev-tools';

type DevToolsSectionProps = {
  db: SQLiteDatabase;
  userId: string | undefined;
};

/**
 * Outils de dev de l'écran Aujourd'hui (seed, nettoyage DB, reset total).
 * Rendu uniquement sous __DEV__ — extrait de today-screen (R6).
 */
export function DevToolsSection({ db, userId }: DevToolsSectionProps) {
  const {
    seedTestData,
    seedAnalytics,
    removeAnalyticsSeedData,
    cleanInactivePrograms,
    fullReset,
  } = useDevTools(db, userId);

  return (
    <View className="gap-2">
      <AppText variant="caption" muted>DEV</AppText>
      <Button
        label="Seed test"
        onPress={seedTestData}
        variant="secondary"
        testID="seed-test-button"
      />
      <Button
        label="Seed analytics (graphes Progrès)"
        onPress={seedAnalytics}
        variant="secondary"
        testID="seed-analytics-button"
      />
      <Button
        label="Retirer le mock (restaurer mon programme)"
        onPress={removeAnalyticsSeedData}
        variant="secondary"
        testID="remove-analytics-seed-button"
      />
      <Button
        label="Nettoyer DB (suppr. programmes inactifs)"
        onPress={cleanInactivePrograms}
        variant="secondary"
      />
      <Button
        label="Reset total (tout effacer)"
        onPress={fullReset}
        variant="secondary"
      />
    </View>
  );
}
