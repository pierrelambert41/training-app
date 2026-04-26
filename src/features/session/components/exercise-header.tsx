import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';

type ExerciseHeaderProps = {
  name: string;
  primaryMuscles: string[];
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRir: number | null;
  targetLoad: number | null;
};

export function ExerciseHeader({
  name,
  primaryMuscles,
  sets,
  repRangeMin,
  repRangeMax,
  targetRir,
  targetLoad,
}: ExerciseHeaderProps) {
  const musclesLabel = primaryMuscles.slice(0, 3).join(', ');

  return (
    <View className="gap-2 pb-4 border-b border-border">
      <Pressable
        onPress={() => console.warn('TODO TA-15: ouvrir fiche exercice en modal')}
        accessibilityLabel={`Voir la fiche de ${name}`}
        accessibilityRole="button"
      >
        <AppText
          className="text-heading font-bold text-content-primary"
          numberOfLines={2}
        >
          {name}
        </AppText>
      </Pressable>

      {musclesLabel ? (
        <AppText className="text-caption text-content-secondary uppercase tracking-wide">
          {musclesLabel}
        </AppText>
      ) : null}

      <View className="flex-row gap-4 mt-1">
        <View className="flex-row items-baseline gap-1">
          <AppText className="text-logger font-bold text-content-primary">
            {targetLoad ?? '—'}
          </AppText>
          <AppText className="text-caption text-content-muted">kg</AppText>
        </View>

        <View className="flex-row items-baseline gap-1">
          <AppText className="text-logger font-bold text-content-primary">
            {sets}×{repRangeMin}
            {repRangeMin !== repRangeMax ? `–${repRangeMax}` : ''}
          </AppText>
        </View>

        {targetRir !== null ? (
          <View className="flex-row items-baseline gap-1">
            <AppText className="text-body font-semibold text-accent">
              RIR {targetRir}
            </AppText>
          </View>
        ) : null}
      </View>
    </View>
  );
}
