import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function ProgramIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.contentPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Programme actif' }} />
      <Stack.Screen name="day/[workoutDayId]" options={{ title: 'Séance' }} />
      <Stack.Screen
        name="day/replace-exercise"
        options={{ title: 'Remplacer l\'exercice', presentation: 'modal' }}
      />
    </Stack>
  );
}
