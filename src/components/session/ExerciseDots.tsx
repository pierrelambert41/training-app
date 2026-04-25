import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';

type DotState = 'done' | 'current' | 'skipped' | 'pending';

type ExerciseDotsProps = {
  count: number;
  currentIndex: number;
  doneIndices: number[];
  skippedIndices: number[];
  onPress: (index: number) => void;
};

function dotStyle(state: DotState): { container: string; inner: string } {
  switch (state) {
    case 'done':
      return {
        container: 'w-5 h-5 rounded-full bg-status-success items-center justify-center',
        inner: '',
      };
    case 'current':
      return {
        container: 'w-5 h-5 rounded-full bg-accent items-center justify-center border-2 border-accent',
        inner: '',
      };
    case 'skipped':
      return {
        container: 'w-4 h-4 rounded-full bg-background-elevated border border-border items-center justify-center',
        inner: '',
      };
    case 'pending':
    default:
      return {
        container: 'w-4 h-4 rounded-full bg-background-elevated border border-border-subtle',
        inner: '',
      };
  }
}

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

export function ExerciseDots({
  count,
  currentIndex,
  doneIndices,
  skippedIndices,
  onPress,
}: ExerciseDotsProps) {
  // No navigation needed for a single exercise; dots add noise without value.
  if (count <= 1) return null;

  return (
    <View className="flex-row items-center justify-center gap-2 py-3">
      {Array.from({ length: count }, (_, i) => {
        const state = dotState(i, currentIndex, doneIndices, skippedIndices);
        const styles = dotStyle(state);

        return (
          <Pressable
            key={i}
            onPress={() => onPress(i)}
            hitSlop={12}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            accessibilityLabel={`Exercice ${i + 1}${state === 'done' ? ' — terminé' : state === 'skipped' ? ' — passé' : state === 'current' ? ' — en cours' : ''}`}
            accessibilityRole="button"
            testID={`exercise-dot-${i}`}
          >
            <View className={styles.container}>
              {state === 'done' ? (
                <AppText className="text-caption font-bold text-white" style={{ fontSize: 9, lineHeight: 12 }}>
                  ✓
                </AppText>
              ) : state === 'skipped' ? (
                <AppText className="text-caption font-bold text-content-muted" style={{ fontSize: 9, lineHeight: 12 }}>
                  —
                </AppText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
