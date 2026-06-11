import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

type TabIconProps = {
  icon: LucideIcon;
  focused: boolean;
};

export function TabIcon({ icon: Icon, focused }: TabIconProps) {
  return (
    <Icon
      size={24}
      color={focused ? colors.accent : colors.contentMuted}
      strokeWidth={focused ? 2.4 : 2}
    />
  );
}
