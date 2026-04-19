import { View, Text } from 'react-native';

type Props = {
  title: string;
  value: string;
  unit?: string;
  status?: 'success' | 'warning' | 'danger' | 'default';
};

const statusClasses: Record<NonNullable<Props['status']>, string> = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  default: 'text-content-primary',
};

export function ThemedCard({ title, value, unit, status = 'default' }: Props) {
  return (
    <View className="bg-background-surface border border-border rounded-card p-4 w-full">
      <Text className="text-label text-content-secondary mb-1">{title}</Text>
      <View className="flex-row items-baseline gap-1">
        <Text className={`text-logger ${statusClasses[status]}`}>{value}</Text>
        {unit && (
          <Text className="text-body text-content-muted">{unit}</Text>
        )}
      </View>
    </View>
  );
}
