import '../global.css';
import { colorScheme } from 'nativewind';
import { Stack } from 'expo-router';

// Module-scope : s'exécute au chargement du module, avant le premier render (évite le flash light)
colorScheme.set('dark');

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#000000' },
        headerTintColor: '#ffffff',
        contentStyle: { backgroundColor: '#000000' },
      }}
    />
  );
}
