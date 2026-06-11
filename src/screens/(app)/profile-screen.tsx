import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileUp, LogOut, UserRound } from 'lucide-react-native';
import { useAuthStore, useAuth } from '@/features/auth';
import { colors } from '@/theme/tokens';
import { SyncStatusSection } from '@/features/sync';

export default function ProfileScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { logout, isLoading } = useAuth();

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
    <View className="flex-1 p-6 gap-6">
      <Text className="text-display text-content-primary">Profil</Text>
      {user && (
        <View className="flex-row items-center gap-3 bg-background-surface border border-border rounded-card p-4">
          <View className="w-11 h-11 rounded-full bg-background-elevated items-center justify-center">
            <UserRound size={22} color={colors.contentSecondary} />
          </View>
          <Text className="text-body text-content-primary flex-1" numberOfLines={1}>
            {user.email}
          </Text>
        </View>
      )}
      <Pressable
        onPress={() => router.push('/(app)/import/hevy')}
        className="bg-background-surface border border-border rounded-card h-tap px-4 flex-row items-center gap-3 active:opacity-70"
      >
        <FileUp size={18} color={colors.contentSecondary} />
        <Text className="text-body text-content-primary font-medium">Importer depuis Hevy (CSV)</Text>
      </Pressable>
      <SyncStatusSection />
      <Pressable
        onPress={logout}
        disabled={isLoading}
        className="border border-status-danger/40 bg-status-danger/10 rounded-button h-tap flex-row gap-2 items-center justify-center mt-auto active:opacity-70 disabled:opacity-50"
      >
        {isLoading ? (
          <ActivityIndicator color={colors.statusDanger} />
        ) : (
          <>
            <LogOut size={18} color={colors.statusDanger} />
            <Text className="text-body text-status-danger font-semibold">Se déconnecter</Text>
          </>
        )}
      </Pressable>
    </View>
    </SafeAreaView>
  );
}
