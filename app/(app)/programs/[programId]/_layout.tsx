import { Stack } from 'expo-router';

export default function ProgramIdLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#080d1a' },
        headerTintColor: '#ffffff',
        contentStyle: { backgroundColor: '#080d1a' },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Programme actif' }} />
      <Stack.Screen name="day/[workoutDayId]" options={{ title: 'Séance' }} />
    </Stack>
  );
}
