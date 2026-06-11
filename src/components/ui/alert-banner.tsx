import { Text, View } from 'react-native';
import { Info, OctagonAlert, TriangleAlert } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

type Tone = 'info' | 'warning' | 'danger';

type Props = {
  tone: Tone;
  title: string;
  message?: string;
  icon?: LucideIcon;
  testID?: string;
};

const toneStyles: Record<Tone, { container: string; title: string; icon: string; fallback: LucideIcon }> = {
  info: {
    container: 'bg-status-info/10',
    title: 'text-status-info',
    icon: colors.statusInfo,
    fallback: Info,
  },
  warning: {
    container: 'bg-status-warning/10',
    title: 'text-status-warning',
    icon: colors.statusWarning,
    fallback: TriangleAlert,
  },
  danger: {
    container: 'bg-status-danger/10',
    title: 'text-status-danger',
    icon: colors.statusDanger,
    fallback: OctagonAlert,
  },
};

/** Bannière d'alerte teintée, sans bordure — deload, plateau, erreurs non bloquantes. */
export function AlertBanner({ tone, title, message, icon, testID }: Props) {
  const t = toneStyles[tone];
  const Icon = icon ?? t.fallback;
  return (
    <View
      className={`flex-row items-start gap-3 rounded-card p-4 ${t.container}`}
      style={{ borderCurve: 'continuous' }}
      testID={testID}
    >
      <View className="mt-0.5">
        <Icon size={18} color={t.icon} strokeWidth={2.2} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className={`text-label font-bold ${t.title}`}>{title}</Text>
        {message ? (
          <Text className="text-caption text-content-secondary" numberOfLines={3}>
            {message}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
