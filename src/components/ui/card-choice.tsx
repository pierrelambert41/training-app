import { Pressable, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';

type Props = {
  label: string;
  description?: string;
  icon?: LucideIcon;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

export function CardChoice({ label, description, icon: Icon, selected, onPress, testID }: Props) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      className={`rounded-card border p-4 min-h-[44px] active:opacity-70 ${
        selected
          ? 'bg-accent/10 border-accent'
          : 'bg-background-surface border-border'
      }`}
    >
      <View className="flex-row items-center gap-3">
        {Icon ? (
          <View
            className={`w-11 h-11 rounded-full items-center justify-center ${
              selected ? 'bg-accent/15' : 'bg-background-elevated'
            }`}
          >
            <Icon size={22} color={selected ? colors.accent : colors.contentSecondary} />
          </View>
        ) : null}
        <View className="flex-1">
          <Text className="text-body font-semibold text-content-primary">{label}</Text>
          {description ? (
            <Text className="text-caption mt-0.5 text-content-secondary">{description}</Text>
          ) : null}
        </View>
        <View
          className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
            selected ? 'border-accent' : 'border-border-strong'
          }`}
        >
          {selected ? (
            <View className="w-2.5 h-2.5 rounded-full bg-accent" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
