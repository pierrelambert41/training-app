import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FileUp, LogOut, UserRound } from 'lucide-react-native';
import { useAuthStore, useAuth } from '@/features/auth';
import { useDB } from '@/hooks/use-db';
import { useSettingsStore } from '@/stores/settings-store';
import { colors } from '@/theme/tokens';
import { AppText, ListGroup, ListRow, SectionHeader, SegmentedControl } from '@/components/ui';
import { SyncStatusSection } from '@/features/sync';

export default function ProfileScreen() {
  const router = useRouter();
  const db = useDB();
  const user = useAuthStore((s) => s.user);
  const { logout, isLoading } = useAuth();
  const preferredUnit = useSettingsStore((s) => s.preferredUnit);
  const setPreferredUnit = useSettingsStore((s) => s.setPreferredUnit);

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
    <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6 pb-12">
      <View className="mt-4 gap-4">
        <Text className="text-display text-content-primary">Profil</Text>
        {user && (
          <View className="items-center gap-3 py-2">
            <View className="w-20 h-20 rounded-full bg-background-elevated items-center justify-center">
              <UserRound size={36} color={colors.contentSecondary} strokeWidth={1.6} />
            </View>
            <AppText variant="body" className="font-semibold" numberOfLines={1}>
              {user.email}
            </AppText>
          </View>
        )}
      </View>

      <View className="gap-3">
        <SectionHeader title="Préférences" />
        <View className="bg-background-surface rounded-card p-4 gap-3">
          <View className="gap-0.5">
            <AppText variant="body" className="font-medium">Unité de poids</AppText>
            <AppText variant="caption" muted>
              Unité d'affichage par défaut — modifiable par exercice pour les machines en lb.
            </AppText>
          </View>
          <SegmentedControl
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
            value={preferredUnit}
            onChange={(unit) => setPreferredUnit(db, unit)}
            testID="preferred-unit-control"
          />
        </View>
      </View>

      <View className="gap-3">
        <SectionHeader title="Données" />
        <ListGroup>
          <ListRow
            icon={FileUp}
            label="Importer depuis Hevy (CSV)"
            chevron
            onPress={() => router.push('/(app)/import/hevy')}
            testID="profile-import-hevy"
          />
        </ListGroup>
      </View>

      <View className="gap-3">
        <SectionHeader title="Synchronisation" />
        <SyncStatusSection />
      </View>

      <View className="gap-3 mt-2">
        <ListGroup>
          <ListRow
            icon={LogOut}
            label={isLoading ? 'Déconnexion…' : 'Se déconnecter'}
            tone="danger"
            onPress={isLoading ? undefined : logout}
            testID="profile-logout"
          />
        </ListGroup>
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}
