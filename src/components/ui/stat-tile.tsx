import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

type Tone = 'accent' | 'warning' | 'danger' | 'neutral';

type Props = {
  icon: LucideIcon;
  value: string;
  label: string;
  tone?: Tone;
  testID?: string;
};

const toneStyles: Record<Tone, { bubble: string; icon: string; value: string }> = {
  accent: { bubble: 'bg-accent/15', icon: '#a3e635', value: 'text-content-primary' },
  warning: { bubble: 'bg-status-warning/15', icon: '#fbbf24', value: 'text-status-warning' },
  danger: { bubble: 'bg-status-danger/15', icon: '#f87171', value: 'text-status-danger' },
  neutral: { bubble: 'bg-background-elevated', icon: '#a1a1aa', value: 'text-content-primary' },
};

export function StatTile({ icon: Icon, value, label, tone = 'neutral', testID }: Props) {
  const t = toneStyles[tone];
  return (
    <View
      className="flex-1 bg-background-surface rounded-card p-4 gap-3"
      style={{ borderCurve: 'continuous' }}
      testID={testID}
    >
      <View className={`w-9 h-9 rounded-full items-center justify-center ${t.bubble}`}>
        <Icon size={18} color={t.icon} strokeWidth={2.2} />
      </View>
      <View className="gap-0.5">
        <Text
          className={`font-bold ${t.value}`}
          style={{ fontSize: 22, lineHeight: 26, letterSpacing: -0.3 }}
          numberOfLines={1}
        >
          {value}
        </Text>
        <Text className="text-caption text-content-muted" numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}
