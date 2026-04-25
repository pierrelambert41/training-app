import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function ProgramsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.contentPrimary,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="generate" options={{ headerShown: false }} />
      <Stack.Screen name="[programId]" options={{ headerShown: false }} />
    </Stack>
  );
}
