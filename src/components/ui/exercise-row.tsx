import { TouchableOpacity, View } from 'react-native';
import type { Exercise } from '@/types';
import { AppText } from './text';

type Props = {
  exercise: Exercise;
  onPress: (exercise: Exercise) => void;
};

export function ExerciseRow({ exercise, onPress }: Props) {
  const displayName = exercise.nameFr ?? exercise.name;
  const muscles = exercise.primaryMuscles.join(', ');

  return (
    <TouchableOpacity
      className="flex-row items-center justify-between px-4 py-3 border-b border-border"
      onPress={() => onPress(exercise)}
      activeOpacity={0.6}
      testID={`exercise-row-${exercise.id}`}
    >
      <View className="flex-1 gap-0.5">
        <AppText variant="body">{displayName}</AppText>
        {muscles.length > 0 ? (
          <AppText variant="caption" muted numberOfLines={1}>
            {muscles}
          </AppText>
        ) : null}
      </View>
      <AppText variant="caption" muted className="ml-3">
        ›
      </AppText>
    </TouchableOpacity>
  );
}
