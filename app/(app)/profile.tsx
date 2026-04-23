import { View, Text, Pressable } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  return (
    <View className="flex-1 bg-background p-6 gap-6">
      <Text className="text-heading text-content-primary">Profil</Text>
      {user && (
        <Text className="text-body text-content-secondary">{user.email}</Text>
      )}
      <Pressable
        onPress={() => setUser(null)}
        className="bg-accent rounded-button h-tap items-center justify-center mt-auto"
      >
        <Text className="text-body text-white font-semibold">Se déconnecter</Text>
      </Pressable>
    </View>
  );
}
