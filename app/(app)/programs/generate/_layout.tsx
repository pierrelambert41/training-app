import { Stack } from 'expo-router';

export default function GenerateLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#080d1a' },
        headerTintColor: '#ffffff',
        contentStyle: { backgroundColor: '#080d1a' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Objectif' }} />
      <Stack.Screen name="step-2-frequency" options={{ title: 'Fréquence' }} />
      <Stack.Screen name="step-3-level" options={{ title: 'Niveau' }} />
      <Stack.Screen name="step-4-equipment" options={{ title: 'Matériel' }} />
      <Stack.Screen name="step-5-constraints" options={{ title: 'Contraintes' }} />
      <Stack.Screen name="step-6-coaching" options={{ title: 'Coaching' }} />
      <Stack.Screen name="step-7-advanced" options={{ title: 'Données avancées' }} />
      <Stack.Screen name="step-8-summary" options={{ title: 'Résumé' }} />
    </Stack>
  );
}
