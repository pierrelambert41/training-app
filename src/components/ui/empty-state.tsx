import { View } from 'react-native';
import { Inbox } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/theme/tokens';
import { Card } from './card';
import { AppText } from './text';

type Props = {
  title: string;
  description: string;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, icon }: Props) {
  const Icon = icon ?? Inbox;
  return (
    <Card elevation="default" className="items-center gap-3 py-8">
      <View className="w-12 h-12 rounded-full bg-background-elevated items-center justify-center">
        <Icon size={22} color={colors.contentMuted} strokeWidth={1.8} />
      </View>
      <AppText variant="body" className="font-semibold">{title}</AppText>
      <AppText variant="caption" muted className="text-center px-4">
        {description}
      </AppText>
    </Card>
  );
}
