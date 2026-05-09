import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore, useAuth } from '@/features/auth';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout, isLoading } = useAuth();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
    <View className="flex-1 p-6 gap-6">
      <Text className="text-heading text-content-primary">Profil</Text>
      {user && (
        <Text className="text-body text-content-secondary">{user.email}</Text>
      )}
      <Pressable
        onPress={() => router.push('/(app)/import/hevy')}
        className="bg-background-surface border border-border rounded-button h-tap items-center justify-center"
      >
        <Text className="text-body text-content-primary font-semibold">Importer depuis Hevy (CSV)</Text>
      </Pressable>
      <Pressable
        onPress={logout}
        disabled={isLoading}
        className="bg-accent rounded-button h-tap items-center justify-center mt-auto disabled:opacity-50"
      >
        {isLoading ? (
          <ActivityIndicator color={colors.contentOnAccent} />
        ) : (
          <Text className="text-body text-content-on-accent font-semibold">Se déconnecter</Text>
        )}
      </Pressable>
    </View>
    </SafeAreaView>
  );
}
