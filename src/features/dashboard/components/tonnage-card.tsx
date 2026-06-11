import { Pressable, ScrollView, View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { toDisplayWeight } from '@/lib/units';
import { usePreferredUnit } from '@/stores/settings-store';
import type { TonnagePoint, TonnageWorkoutDay } from '../domain/tonnage-history';
import { LineChart } from './line-chart';

type Props = {
  workoutDays: TonnageWorkoutDay[];
  selectedDayId: string | null;
  onSelectDay: (id: string) => void;
  points: TonnagePoint[];
};

function formatDateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

/**
 * Carte "Tonnage par séance" : évolution du tonnage à séance type répétée.
 * Métrique de SUIVI uniquement — le moteur de progression raisonne en
 * séries/muscle (doctrine volume-first).
 */
export function TonnageCard({ workoutDays, selectedDayId, onSelectDay, points }: Props) {
  const unit = usePreferredUnit();
  const last = points.length > 0 ? points[points.length - 1]!.tonnageKg : null;
  const hasMissingBodyweight = points.some((p) => p.missingBodyweight);

  return (
    <Card elevation="default" className="gap-3" testID="tonnage-card">
      <AppText variant="body" className="font-semibold">
        Tonnage par séance
      </AppText>

      {workoutDays.length === 0 ? (
        <AppText variant="caption" muted testID="tonnage-card-empty">
          Répète une même séance au moins 2 fois pour suivre l'évolution de ton tonnage.
        </AppText>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {workoutDays.map((day) => {
                const selected = day.id === selectedDayId;
                return (
                  <Pressable
                    key={day.id}
                    onPress={() => onSelectDay(day.id)}
                    className={`h-tap justify-center px-4 rounded-chip border ${
                      selected
                        ? 'bg-accent border-accent'
                        : 'bg-background-surface border-border'
                    }`}
                    accessibilityLabel={`Séance ${day.title}`}
                    testID={`tonnage-day-chip-${day.id}`}
                  >
                    <AppText
                      variant="caption"
                      className={
                        selected
                          ? 'text-content-on-accent font-semibold'
                          : 'text-content-secondary'
                      }
                    >
                      {day.title}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {last !== null ? (
            <View className="flex-row items-baseline gap-2">
              <AppText variant="heading" testID="tonnage-last-value">
                {toDisplayWeight(last, unit).toLocaleString('fr-FR')} {unit}
              </AppText>
              <AppText variant="caption" muted>
                dernière séance
              </AppText>
            </View>
          ) : null}

          <LineChart
            points={points.map((p) => ({
              label: formatDateLabel(p.date),
              value: toDisplayWeight(p.tonnageKg, unit),
            }))}
            formatValue={(v) => `${Math.round(v).toLocaleString('fr-FR')} ${unit}`}
            emptyMessage="Pas encore assez de séances complétées sur ce jour (minimum 2)."
            testID="tonnage-chart"
          />

          {hasMissingBodyweight ? (
            <AppText variant="caption" muted testID="tonnage-missing-bw">
              Certaines séances incluent des exos au poids du corps sans pesée — tonnage sous-estimé.
            </AppText>
          ) : null}
        </>
      )}
    </Card>
  );
}
