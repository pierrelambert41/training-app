import { View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { FatiguePoint } from '../domain/fatigue-trend';
import { fatigueLevelDisplay } from '../domain/fatigue-trend';
import { LineChart } from './line-chart';

type Props = {
  points: FatiguePoint[];
};

function formatDateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

/**
 * Carte "Fatigue" : fatigue_score (0-10, moteur TA-105) des séances
 * complétées sur 60 jours + palier courant (seuils business-rules §3.2,
 * cohérents avec la FatigueCard de l'écran Aujourd'hui).
 */
export function FatigueTrendCard({ points }: Props) {
  const last = points.length > 0 ? points[points.length - 1]! : null;
  const level = last ? fatigueLevelDisplay(last.score) : null;

  return (
    <Card elevation="default" className="gap-3" testID="fatigue-trend-card">
      <View className="flex-row items-baseline justify-between">
        <AppText variant="body" className="font-semibold">
          Fatigue
        </AppText>
        {last && level ? (
          <View className="flex-row items-baseline gap-2">
            <AppText variant="heading" testID="fatigue-last-score">
              {last.score}/10
            </AppText>
            <AppText variant="caption" className={level.colorClass} testID="fatigue-level">
              {level.label}
            </AppText>
          </View>
        ) : null}
      </View>

      <LineChart
        points={points.map((p) => ({
          label: formatDateLabel(p.date),
          value: p.score,
        }))}
        color={colors.accent}
        formatValue={(v) => `${v}`}
        emptyMessage="Le score de fatigue se construit au fil des séances complétées."
        testID="fatigue-chart"
      />
    </Card>
  );
}
