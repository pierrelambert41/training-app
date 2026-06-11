import { Pressable, View } from 'react-native';

type DotState = 'done' | 'current' | 'skipped' | 'pending';

type ExerciseDotsProps = {
  count: number;
  currentIndex: number;
  doneIndices: number[];
  skippedIndices: number[];
  onPress: (index: number) => void;
};

const segmentClasses: Record<DotState, string> = {
  done: 'bg-status-success',
  current: 'bg-accent',
  skipped: 'bg-border-strong',
  pending: 'bg-background-elevated',
};

function dotState(
  index: number,
  currentIndex: number,
  doneIndices: number[],
  skippedIndices: number[]
): DotState {
  if (doneIndices.includes(index)) return 'done';
  if (skippedIndices.includes(index)) return 'skipped';
  if (index === currentIndex) return 'current';
  return 'pending';
}

/**
 * Barre de progression segmentée de la séance : un segment par exercice.
 * Volt = en cours, vert = fait, gris = passé, sombre = à venir.
 * Tap sur un segment pour naviguer.
 */
export function ExerciseDots({
  count,
  currentIndex,
  doneIndices,
  skippedIndices,
  onPress,
}: ExerciseDotsProps) {
  // No navigation needed for a single exercise; the bar adds noise without value.
  if (count <= 1) return null;

  return (
    <View className="flex-row items-center gap-1.5 px-4 py-3">
      {Array.from({ length: count }, (_, i) => {
        const state = dotState(i, currentIndex, doneIndices, skippedIndices);

        return (
          <Pressable
            key={i}
            onPress={() => onPress(i)}
            hitSlop={12}
            className="flex-1 items-stretch justify-center"
            style={{ height: 24 }}
            accessibilityLabel={`Exercice ${i + 1}${state === 'done' ? ' — terminé' : state === 'skipped' ? ' — passé' : state === 'current' ? ' — en cours' : ''}`}
            accessibilityRole="button"
            testID={`exercise-dot-${i}`}
          >
            <View
              className={`rounded-chip ${segmentClasses[state]}`}
              style={{ height: state === 'current' ? 6 : 4, alignSelf: 'stretch' }}
            />
          </Pressable>
        );
      })}
    </View>
  );
}
