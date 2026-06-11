import { Stack } from 'expo-router';
import { colors } from '@/theme/tokens';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.contentPrimary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      {/* Sans cette déclaration, le Stack parent ajoute son propre header
          au-dessus de celui du Stack imbriqué → double top bar. */}
      <Stack.Screen name="programs" options={{ headerShown: false }} />
      <Stack.Screen name="create-exercise" options={{ title: 'Nouvel exercice', presentation: 'modal' }} />
      {/* NAV-01 : sans déclaration, le titre par défaut est le nom de la
          route (« exercise/[id] »). L'écran pousse le nom de l'exercice
          en titre dynamique une fois chargé. */}
      <Stack.Screen name="exercise/[id]" options={{ title: 'Exercice' }} />
      <Stack.Screen name="design-system" options={{ title: 'Design system' }} />
      <Stack.Screen name="session/start" options={{ title: 'Avant la séance', headerBackTitle: 'Retour' }} />
      <Stack.Screen name="session/live" options={{ headerShown: false }} />
      <Stack.Screen name="session/end" options={{ headerShown: false }} />
      <Stack.Screen name="session/summary" options={{ headerShown: false }} />
      <Stack.Screen name="import/hevy" options={{ headerShown: false }} />
    </Stack>
  );
}
