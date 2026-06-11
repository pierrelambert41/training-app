import { Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

type Props = {
  icon: LucideIcon;
  label: string;
  value: number;
  muted?: boolean;
};

export function StatRow({ icon: Icon, label, value, muted = false }: Props) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="w-6 items-center">
        <Icon size={16} color={muted ? colors.contentMuted : colors.contentSecondary} />
      </View>
      <Text className={`text-body flex-1 ${muted ? 'text-content-muted' : 'text-content-secondary'}`}>
        {label}
      </Text>
      <Text className={`text-body font-bold ${muted ? 'text-content-muted' : 'text-content-primary'}`}>
        {value}
      </Text>
    </View>
  );
}
