import { View, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { AppText, Button, EmptyState } from '@/components/ui';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout, isLoading } = useAuth();

  async function handleLogout() {
    await logout();
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-6"
      testID="home-screen"
    >
      <View className="mt-4 gap-1">
        <AppText variant="heading">Bonjour</AppText>
        {user?.email ? (
          <AppText variant="body" muted>{user.email}</AppText>
        ) : null}
      </View>

      <View className="gap-2">
        <AppText variant="caption" muted>SÉANCE DU JOUR</AppText>
        <EmptyState title="Aucune séance planifiée" description="Ton programme apparaîtra ici une fois généré." />
      </View>

      <View className="gap-2">
        <AppText variant="caption" muted>PROGRESSION</AppText>
        <EmptyState title="Pas encore de données" description="Ton programme apparaîtra ici une fois généré." />
      </View>

      <View className="gap-2">
        <AppText variant="caption" muted>ACCÈS RAPIDE</AppText>
        <Button
          label="Créer un programme"
          onPress={() => router.push('/(app)/programs/generate' as Parameters<typeof router.push>[0])}
          variant="secondary"
          testID="generate-program-button"
        />
        <Button
          label="Bibliothèque d'exercices"
          // TODO: supprimer quand expo-router régénère les types pour la route dynamique /exercise/[id]
          onPress={() => router.push('/(app)/library' as Parameters<typeof router.push>[0])}
          variant="secondary"
          testID="library-nav-button"
        />
      </View>

      <View className="mt-4">
        <Button
          label="Se déconnecter"
          onPress={handleLogout}
          variant="ghost"
          loading={isLoading}
          testID="logout-button"
        />
      </View>
    </ScrollView>
  );
}
