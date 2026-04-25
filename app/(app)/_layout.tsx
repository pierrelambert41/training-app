import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.contentPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="create-exercise" options={{ title: 'Nouvel exercice', presentation: 'modal' }} />
    </Stack>
  );
}
