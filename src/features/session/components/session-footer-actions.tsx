import { Pressable, View } from 'react-native';
import { Flag } from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

type SessionFooterActionsProps = {
  onEnd: () => void;
  onAbandon: () => void;
};

export function SessionFooterActions({ onEnd, onAbandon }: SessionFooterActionsProps) {
  return (
    <View className="px-4 pb-6 pt-2 gap-1 bg-background">
      <Pressable
        onPress={onEnd}
        className="h-14 rounded-button flex-row gap-2 items-center justify-center bg-background-elevated active:opacity-80"
        accessibilityLabel="Terminer la séance"
        testID="end-session-button"
      >
        <Flag size={16} color={colors.contentPrimary} strokeWidth={2.2} />
        <AppText className="text-label font-semibold text-content-primary">
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
        <AppText className="text-caption text-content-muted">
          Abandonner la séance
        </AppText>
      </Pressable>
    </View>
  );
}
