import { Pressable, View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { muscleLabel } from '@/lib/muscle-labels';
import type { MuscleVolume } from '../domain/weekly-volume';
import { BarChart } from './bar-chart';

type Props = {
  volumes: MuscleVolume[];
  weekStart: string;
  weekOffset: number;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
};

function formatWeekLabel(weekStart: string): string {
  const [, month, day] = weekStart.split('-');
  return `Semaine du ${day}/${month}`;
}

/**
 * Carte "Volume par muscle" : séries complétées par groupe musculaire
 * (comptage agoniste) pour la semaine sélectionnée. Comptages bruts
 * uniquement — pas de seuils non sourcés (evidence-only).
 */
export function VolumeCard({
  volumes,
  weekStart,
  weekOffset,
  onPreviousWeek,
  onNextWeek,
}: Props) {
  const isCurrentWeek = weekOffset === 0;

  return (
    <Card elevation="default" className="gap-3" testID="volume-card">
      <AppText variant="body" className="font-semibold">
        Volume par muscle
      </AppText>

      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onPreviousWeek}
          className="h-tap w-tap items-center justify-center"
          accessibilityLabel="Semaine précédente"
          testID="volume-prev-week"
        >
          <AppText variant="body" className="text-accent font-semibold">
            ‹
          </AppText>
        </Pressable>
        <AppText variant="caption" muted testID="volume-week-label">
          {formatWeekLabel(weekStart)}
          {isCurrentWeek ? ' (en cours)' : ''}
        </AppText>
        <Pressable
          onPress={onNextWeek}
          disabled={isCurrentWeek}
          className="h-tap w-tap items-center justify-center"
          accessibilityLabel="Semaine suivante"
          testID="volume-next-week"
        >
          <AppText
            variant="body"
            className={
              isCurrentWeek ? 'text-content-muted' : 'text-accent font-semibold'
            }
          >
            ›
          </AppText>
        </Pressable>
      </View>

      <BarChart
        items={volumes.map((v) => ({
          label: muscleLabel(v.muscle),
          value: v.sets,
        }))}
        emptyMessage="Aucune séance complétée cette semaine."
        testID="volume-chart"
      />

      {volumes.length > 0 ? (
        <AppText variant="caption" muted>
          Séries par muscle (comptage agoniste : un set compte pour chaque
          muscle principal de l'exercice).
        </AppText>
      ) : null}
    </Card>
  );
}
