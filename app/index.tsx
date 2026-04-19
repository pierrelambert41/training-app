import { View, Text, ScrollView } from 'react-native';
import { ThemedCard } from '@/components/ui/themed-card';

export default function HomeScreen() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 gap-4"
    >
      <Text className="text-heading text-content-primary mt-4">Training App</Text>
      <Text className="text-label text-content-secondary">Design system — validation NativeWind</Text>

      <ThemedCard title="Charge cible" value="95" unit="kg" status="default" />
      <ThemedCard title="Bench Press — progrès" value="+2.5" unit="kg" status="success" />
      <ThemedCard title="Fatigue globale" value="Modérée" status="warning" />
      <ThemedCard title="Dernier set" value="Échec rep 4" status="danger" />

      <View className="bg-accent rounded-button items-center justify-center h-tap mt-4">
        <Text className="text-body text-white font-semibold">LOG SET</Text>
      </View>
    </ScrollView>
  );
}
