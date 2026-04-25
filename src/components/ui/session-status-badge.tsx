import { View, Text } from 'react-native';
import type { SessionStatus } from '@/utils/session-status';

const badgeConfig: Record<SessionStatus, { label: string; containerClass: string; textClass: string }> = {
  progression: {
    label: 'Progression',
    containerClass: 'bg-status-success/20 border border-status-success',
    textClass: 'text-status-success',
  },
  maintien: {
    label: 'Maintien',
    containerClass: 'bg-accent/20 border border-accent',
    textClass: 'text-accent',
  },
  allegee: {
    label: 'Allégée',
    containerClass: 'bg-status-warning/20 border border-status-warning',
    textClass: 'text-status-warning',
  },
  deload: {
    label: 'Deload',
    containerClass: 'bg-status-danger/20 border border-status-danger',
    textClass: 'text-status-danger',
  },
};

type Props = {
  status: SessionStatus;
};

export function SessionStatusBadge({ status }: Props) {
  const { label, containerClass, textClass } = badgeConfig[status];
  return (
    <View className={`self-start rounded-chip px-3 py-1 ${containerClass}`}>
      <Text className={`text-caption font-semibold ${textClass}`}>{label}</Text>
    </View>
  );
}
