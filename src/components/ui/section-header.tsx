import { Pressable, Text, View } from 'react-native';

type Props = {
  title: string;
  action?: string;
  onAction?: () => void;
};

export function SectionHeader({ title, action, onAction }: Props) {
  return (
    <View className="flex-row items-center justify-between px-1">
      <Text
        className="text-caption font-semibold text-content-muted uppercase"
        style={{ letterSpacing: 1.4 }}
      >
        {title}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={12} className="active:opacity-70">
          <Text className="text-caption font-semibold text-accent">{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
