import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Card } from '@/components/ui';

type PlaceholderProps = {
  title: string;
  description: string;
  testID: string;
};

function PlaceholderCard({ title, description, testID }: PlaceholderProps) {
  return (
    <Card elevation="default" className="gap-1" testID={testID}>
      <AppText variant="body" className="font-semibold">
        {title}
      </AppText>
      <AppText variant="caption" muted>
        {description}
      </AppText>
    </Card>
  );
}

/**
 * Écran Progrès (Phase 8). Squelette : chaque section placeholder est
 * remplacée par sa carte analytics au fil des stories du dashboard.
 */
export function ProgressScreen() {
  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4 gap-6 pb-12"
        testID="progress-screen"
      >
        <View className="mt-4 gap-1">
          <AppText variant="heading">Progrès</AppText>
          <AppText variant="body" muted>
            Ta progression en un coup d'œil
          </AppText>
        </View>

        <PlaceholderCard
          title="Progression par exercice"
          description="Courbe e1RM — bientôt disponible"
          testID="placeholder-e1rm"
        />
        <PlaceholderCard
          title="Volume par muscle"
          description="Séries hebdomadaires par groupe musculaire — bientôt disponible"
          testID="placeholder-volume"
        />
        <PlaceholderCard
          title="Poids du corps"
          description="Saisie et courbe de progression — bientôt disponible"
          testID="placeholder-bodyweight"
        />
        <PlaceholderCard
          title="Fatigue"
          description="Score de fatigue dans le temps — bientôt disponible"
          testID="placeholder-fatigue"
        />
        <PlaceholderCard
          title="Compliance au plan"
          description="Séances réalisées vs planifiées — bientôt disponible"
          testID="placeholder-compliance"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
