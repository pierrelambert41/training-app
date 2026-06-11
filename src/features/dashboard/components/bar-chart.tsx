import { View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

export type BarChartItem = {
  label: string;
  value: number;
};

type Props = {
  items: BarChartItem[];
  color?: string;
  /** Formatte la valeur affichée à droite de chaque barre. */
  formatValue?: (value: number) => string;
  emptyMessage?: string;
  testID?: string;
};

/**
 * Barres horizontales pures (data en props, aucun I/O — R4). Layout
 * horizontal plutôt que vertical : les labels (groupes musculaires…)
 * restent lisibles sur écran étroit. Échelle relative au max de la série.
 */
export function BarChart({
  items,
  color = colors.accent,
  formatValue = (v) => String(v),
  emptyMessage = 'Pas encore de données',
  testID = 'bar-chart',
}: Props) {
  if (items.length === 0) {
    return (
      <View
        className="items-center justify-center py-8"
        testID={`${testID}-empty`}
      >
        <AppText variant="caption" muted>
          {emptyMessage}
        </AppText>
      </View>
    );
  }

  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <View className="gap-2" testID={testID}>
      {items.map((item) => (
        <View key={item.label} className="flex-row items-center gap-2">
          <AppText
            variant="caption"
            muted
            className="w-24"
            numberOfLines={1}
          >
            {item.label}
          </AppText>
          <View className="flex-1 h-4 rounded-chip bg-background-surface overflow-hidden">
            <View
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: color,
              }}
              className="h-4 rounded-chip"
              testID={`${testID}-bar-${item.label}`}
            />
          </View>
          <AppText
            variant="caption"
            className="w-10 text-right font-semibold text-content-primary"
          >
            {formatValue(item.value)}
          </AppText>
        </View>
      ))}
    </View>
  );
}
