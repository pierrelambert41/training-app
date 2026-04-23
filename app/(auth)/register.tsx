import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-background items-center justify-center p-6 gap-6">
      <Text className="text-heading text-content-primary">Créer un compte</Text>
      <Text className="text-label text-content-secondary">Inscription</Text>
      <Pressable
        onPress={() => router.back()}
        className="w-full bg-accent rounded-button h-tap items-center justify-center"
      >
        <Text className="text-body text-white font-semibold">Retour</Text>
      </Pressable>
    </View>
  );
}
