import { View, Text, Pressable } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const setUser = useAuthStore((s) => s.setUser);

  function handleLogin() {
    setUser({ id: '1', email: 'dev@training.app', createdAt: new Date().toISOString() });
  }

  return (
    <View className="flex-1 bg-background items-center justify-center p-6 gap-6">
      <Text className="text-heading text-content-primary">Training App</Text>
      <Text className="text-label text-content-secondary">Connexion</Text>
      <Pressable
        onPress={handleLogin}
        className="w-full bg-accent rounded-button h-tap items-center justify-center"
      >
        <Text className="text-body text-white font-semibold">Se connecter</Text>
      </Pressable>
    </View>
  );
}
