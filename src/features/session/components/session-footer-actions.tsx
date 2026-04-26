import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';

type SessionFooterActionsProps = {
  onEnd: () => void;
  onAbandon: () => void;
};

export function SessionFooterActions({ onEnd, onAbandon }: SessionFooterActionsProps) {
  return (
    <View className="px-4 pb-6 pt-2 gap-2 border-t border-border bg-background">
      <Pressable
        onPress={onEnd}
        className="h-14 rounded-button items-center justify-center bg-background-surface border border-border-strong"
        accessibilityLabel="Terminer la séance"
        testID="end-session-button"
      >
        <AppText className="text-label font-semibold text-content-secondary">
          Terminer la séance
        </AppText>
      </Pressable>
      <Pressable
        onPress={onAbandon}
        hitSlop={8}
        style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
        accessibilityLabel="Abandonner la séance"
        accessibilityRole="button"
        testID="abandon-session-button"
      >
        <AppText className="text-label text-content-muted underline">
          Abandonner la séance
        </AppText>
      </Pressable>
    </View>
  );
}
