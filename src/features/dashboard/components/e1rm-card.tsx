import { Pressable, ScrollView, View } from 'react-native';
import { AppText, Card } from '@/components/ui';
import { formatWeight, toDisplayWeight } from '@/lib/units';
import { usePreferredUnit } from '@/stores/settings-store';
import type { E1rmPoint, LoggedExercise } from '../domain/e1rm-history';
import { e1rmDelta } from '../domain/e1rm-history';
import { LineChart } from './line-chart';

type Props = {
  exercises: LoggedExercise[];
  selectedExerciseId: string | null;
  onSelectExercise: (id: string) => void;
  points: E1rmPoint[];
};

function formatDateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

/**
 * Carte "Progression par exercice" : sélecteur (chips) + courbe e1RM
 * (meilleur set par séance, fenêtre 90 jours) + dernière valeur et delta.
 */
export function E1rmCard({
  exercises,
  selectedExerciseId,
  onSelectExercise,
  points,
}: Props) {
  const unit = usePreferredUnit();
  const last = points.length > 0 ? points[points.length - 1]!.e1rm : null;
  const delta = e1rmDelta(points);

  return (
    <Card elevation="default" className="gap-3" testID="e1rm-card">
      <AppText variant="body" className="font-semibold">
        Progression par exercice
      </AppText>

      {exercises.length === 0 ? (
        <AppText variant="caption" muted testID="e1rm-card-empty">
          Logge des séances avec charges pour voir ta progression.
        </AppText>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {exercises.map((ex) => {
                const selected = ex.id === selectedExerciseId;
                return (
                  <Pressable
                    key={ex.id}
                    onPress={() => onSelectExercise(ex.id)}
                    className={`h-tap justify-center px-4 rounded-chip border ${
                      selected
                        ? 'bg-accent border-accent'
                        : 'bg-background-surface border-border'
                    }`}
                    accessibilityLabel={`Exercice ${ex.name}`}
                    testID={`e1rm-exercise-chip-${ex.id}`}
                  >
                    <AppText
                      variant="caption"
                      className={
                        selected
                          ? 'text-content-on-accent font-semibold'
                          : 'text-content-secondary'
                      }
                    >
                      {ex.name}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          {last !== null ? (
            <View className="flex-row items-baseline gap-2">
              <AppText variant="heading" testID="e1rm-last-value">
                {formatWeight(last, unit)}
              </AppText>
              {delta !== null ? (
                <AppText
                  variant="caption"
                  className={
                    delta >= 0 ? 'text-status-success' : 'text-status-danger'
                  }
                  testID="e1rm-delta"
                >
                  {delta >= 0 ? '+' : ''}{toDisplayWeight(delta, unit)} {unit} sur la période
                </AppText>
              ) : null}
            </View>
          ) : null}

          <LineChart
            points={points.map((p) => ({
              label: formatDateLabel(p.date),
              value: toDisplayWeight(p.e1rm, unit),
            }))}
            formatValue={(v) => `${v} ${unit}`}
            emptyMessage="Pas encore assez de séances sur cet exercice (minimum 2)."
            testID="e1rm-chart"
          />
        </>
      )}
    </Card>
  );
}
