import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useActiveProgramStore } from '@/stores/active-program-store';
import { useActiveProgram } from '@/hooks/use-active-program';
import { Button, AppText, Card } from '@/components/ui';
import ActiveBlockScreen from '@/screens/(app)/programs/active-block-screen';
import { colors } from '@/theme/tokens';

export function ProgramTabScreen() {
  const router = useRouter();
  const { isLoading } = useActiveProgram();
  const program = useActiveProgramStore((s) => s.program);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!program) {
    return (
      <View className="flex-1 bg-background p-4 justify-center">
        <Card elevation="default" className="items-center gap-3 py-6">
          <AppText variant="heading">Aucun programme actif</AppText>
          <AppText variant="body" muted className="text-center">
            Génère ton programme personnalisé pour commencer à t'entraîner.
          </AppText>
          <Button
            label="Créer un programme"
            onPress={() =>
              router.push('/(app)/programs/generate' as Parameters<typeof router.push>[0])
            }
            variant="primary"
            size="lg"
          />
        </Card>
      </View>
    );
  }

  return <ActiveBlockScreen />;
}
