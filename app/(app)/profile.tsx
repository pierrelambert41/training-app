import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useAuth } from '@/hooks/use-auth';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const { logout, isLoading } = useAuth();

  return (
    <View className="flex-1 bg-background p-6 gap-6">
      <Text className="text-heading text-content-primary">Profil</Text>
      {user && (
        <Text className="text-body text-content-secondary">{user.email}</Text>
      )}
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
  );
}
