import { View } from 'react-native';
import { AppText } from '@/components/ui';
import { formatWeight, roundToLoadableIncrement } from '@/lib/units';
import type { WeightUnit } from '@/lib/units';
import type { RecommendationAction } from '@/types/recommendation';

type Props = {
  exerciseName: string;
  /** kg canonique — converti/arrondi dans l'unité de l'exercice à l'affichage. */
  nextLoad: number | null;
  action: RecommendationAction | null;
  unit: WeightUnit;
};

function formatLoadLine(
  nextLoad: number | null,
  action: RecommendationAction | null,
  unit: WeightUnit,
): string {
  if (nextLoad === null) return 'maintien';
  const suffix =
    action === 'increase' ? '+' : action === 'decrease' ? '-' : '';
  const rounded = roundToLoadableIncrement(nextLoad, unit);
  return `${formatWeight(rounded, unit)}${suffix ? ` ${suffix}` : ''}`;
}

export function ExerciseLoadRow({ exerciseName, nextLoad, action, unit }: Props) {
  const isIncrease = action === 'increase';
  const isDecrease = action === 'decrease';
  const loadClass = isIncrease
    ? 'text-status-success'
    : isDecrease
      ? 'text-status-warning'
      : 'text-content-secondary';

  return (
    <View className="flex-row items-center justify-between py-1 min-h-[44px]">
      <AppText variant="body" className="flex-1 mr-2" numberOfLines={1}>
        {exerciseName}
      </AppText>
      <AppText variant="body" className={`font-semibold ${loadClass}`}>
        {formatLoadLine(nextLoad, action, unit)}
      </AppText>
    </View>
  );
}
