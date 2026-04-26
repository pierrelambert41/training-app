import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

type SessionHeaderProps = {
  sessionName: string;
  elapsed: string;
  exerciseIndex: number;
  exerciseCount: number;
  hasSessionNotes: boolean;
  onAddExercise: () => void;
  onSessionNotes: () => void;
};

export function SessionHeader({
  sessionName,
  elapsed,
  exerciseIndex,
  exerciseCount,
  hasSessionNotes,
  onAddExercise,
  onSessionNotes,
}: SessionHeaderProps) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3 bg-background-surface border-b border-border">
      <AppText className="text-label text-content-secondary flex-1" numberOfLines={1}>
        {sessionName}
      </AppText>

      <View className="flex-row items-center gap-1">
        <AppText className="text-label font-semibold text-accent">
          {exerciseIndex + 1}/{exerciseCount}
        </AppText>
        <AppText className="text-label font-mono text-content-secondary ml-2">
          {elapsed}
        </AppText>
        <Pressable
          onPress={onSessionNotes}
          style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel="Notes de séance"
          accessibilityRole="button"
          testID="session-notes-button"
        >
          <AppText
            style={{ fontSize: 18, color: hasSessionNotes ? colors.accent : colors.contentMuted }}
          >
            {'📝'}
          </AppText>
        </Pressable>
        <Pressable
          onPress={onAddExercise}
          style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel="Ajouter un exercice"
          accessibilityRole="button"
          testID="add-exercise-button"
        >
          <AppText className="text-heading font-bold text-accent" style={{ fontSize: 24, lineHeight: 28 }}>
            +
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
