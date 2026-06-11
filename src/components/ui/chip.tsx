import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

type Props = {
  label: string;
  icon?: LucideIcon;
  /** Fond du chip — 'surface' sur fond elevated (hero), 'elevated' sur fond surface. */
  on?: 'surface' | 'elevated';
};

export function Chip({ label, icon: Icon, on = 'elevated' }: Props) {
  return (
    <View
      className={`flex-row items-center gap-1.5 rounded-chip px-3 py-1.5 ${
        on === 'surface' ? 'bg-background/60' : 'bg-background-elevated'
      }`}
    >
      {Icon ? <Icon size={13} color={colors.contentSecondary} strokeWidth={2.2} /> : null}
      <Text className="text-caption font-medium text-content-secondary">{label}</Text>
    </View>
  );
}
