import { Stack } from 'expo-router';

export default function ProgramsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#080d1a' },
        headerTintColor: '#ffffff',
        contentStyle: { backgroundColor: '#080d1a' },
      }}
    >
      <Stack.Screen name="generate" options={{ headerShown: false }} />
    </Stack>
  );
}
