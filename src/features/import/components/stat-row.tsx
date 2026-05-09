import { Text, View } from 'react-native';

type Props = {
  icon: string;
  label: string;
  value: number;
  muted?: boolean;
};

export function StatRow({ icon, label, value, muted = false }: Props) {
  return (
    <View className="flex-row items-center gap-3">
      <Text className="text-base w-6 text-center">{icon}</Text>
      <Text className={`text-body flex-1 ${muted ? 'text-content-muted' : 'text-content-secondary'}`}>
        {label}
      </Text>
      <Text className={`text-body font-bold ${muted ? 'text-content-muted' : 'text-content-primary'}`}>
        {value}
      </Text>
    </View>
  );
}
