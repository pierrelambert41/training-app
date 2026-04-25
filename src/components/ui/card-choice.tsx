import { Pressable, Text, View } from 'react-native';

type Props = {
  label: string;
  description?: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
  testID?: string;
};

export function CardChoice({ label, description, icon, selected, onPress, testID }: Props) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      className={`rounded-card border p-4 min-h-[44px] active:opacity-70 ${
        selected
          ? 'bg-accent border-accent'
          : 'bg-background-surface border-border'
      }`}
    >
      <View className="flex-row items-center gap-3">
        {icon ? (
          <Text className="text-display">{icon}</Text>
        ) : null}
        <View className="flex-1">
          <Text
            className={`text-body font-semibold ${
              selected ? 'text-content-on-accent' : 'text-content-primary'
            }`}
          >
            {label}
          </Text>
          {description ? (
            <Text
              className={`text-caption mt-0.5 ${
                selected ? 'text-content-on-accent opacity-80' : 'text-content-secondary'
              }`}
            >
              {description}
            </Text>
          ) : null}
        </View>
        <View
          className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
            selected ? 'border-content-on-accent' : 'border-border-strong'
          }`}
        >
          {selected ? (
            <View className="w-2.5 h-2.5 rounded-full bg-content-on-accent" />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
