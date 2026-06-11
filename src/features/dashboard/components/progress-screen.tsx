import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useE1rmHistory } from '../hooks/use-e1rm-history';
import { useWeeklyVolume } from '../hooks/use-weekly-volume';
import { useBodyWeight } from '../hooks/use-body-weight';
import { useFatigueCompliance } from '../hooks/use-fatigue-compliance';
import { E1rmCard } from './e1rm-card';
import { VolumeCard } from './volume-card';
import { BodyWeightCard } from './body-weight-card';
import { FatigueTrendCard } from './fatigue-trend-card';
import { ComplianceCard } from './compliance-card';

/**
 * Écran Progrès (Phase 8) : les 5 cartes analytics du dashboard
 * (e1RM, volume/muscle, poids du corps, fatigue, compliance).
 */
export function ProgressScreen() {
  const e1rm = useE1rmHistory();
  const volume = useWeeklyVolume();
  const bodyWeight = useBodyWeight();
  const fatigueCompliance = useFatigueCompliance();

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

        <E1rmCard
          exercises={e1rm.exercises}
          selectedExerciseId={e1rm.selectedExerciseId}
          onSelectExercise={e1rm.selectExercise}
          points={e1rm.points}
        />
        <VolumeCard
          volumes={volume.volumes}
          weekStart={volume.weekStart}
          weekOffset={volume.weekOffset}
          onPreviousWeek={volume.goToPreviousWeek}
          onNextWeek={volume.goToNextWeek}
        />
        <BodyWeightCard
          metrics={bodyWeight.metrics}
          onSaveWeight={bodyWeight.saveWeight}
          isSaving={bodyWeight.isSaving}
        />
        <FatigueTrendCard points={fatigueCompliance.fatiguePoints} />
        <ComplianceCard
          compliance={fatigueCompliance.compliance}
          hasActiveBlock={fatigueCompliance.hasActiveBlock}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
