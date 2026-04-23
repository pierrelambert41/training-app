import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AppText } from '@/components/ui';

// TA-15 — Écran détail exercice (non encore implémenté)
export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 bg-background items-center justify-center p-4">
      <AppText variant="body" muted>
        Détail de l&apos;exercice {id}
      </AppText>
      <AppText variant="caption" muted className="text-center mt-2">
        Écran disponible dans TA-15
      </AppText>
    </View>
  );
}
