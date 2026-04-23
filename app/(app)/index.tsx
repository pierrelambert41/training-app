import { View, ScrollView, Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/ui/text';
import { ThemedCard } from '@/components/ui/themed-card';
import { useAuthStore } from '@/stores/auth-store';

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
    >
      <AppText variant="heading" className="mt-4">Training App</AppText>
      {user && (
        <AppText variant="body" muted>{user.email}</AppText>
      )}

      <ThemedCard title="Charge cible" value="95" unit="kg" status="default" />
      <ThemedCard title="Bench Press — progrès" value="+2.5" unit="kg" status="success" />
      <ThemedCard title="Fatigue globale" value="Modérée" status="warning" />
      <ThemedCard title="Dernier set" value="Échec rep 4" status="danger" />

      <View className="bg-accent rounded-button items-center justify-center h-tap mt-4">
        <Text className="text-body text-white font-semibold">LOG SET</Text>
      </View>

      <Pressable
        onPress={() => router.push('/(app)/profile')}
        className="items-center py-3"
      >
        <Text className="text-label text-content-secondary">Voir le profil</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/(app)/design-system')}
        className="items-center py-3"
      >
        <Text className="text-label text-accent">Design System</Text>
      </Pressable>
    </ScrollView>
  );
}
