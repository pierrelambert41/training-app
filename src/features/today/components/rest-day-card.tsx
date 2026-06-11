import { Pressable, View } from 'react-native';
import { Moon } from 'lucide-react-native';
import { Card, AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

type Props = {
  onViewProgram: () => void;
};

export function RestDayCard({ onViewProgram }: Props) {
  return (
    <Card elevation="default" className="items-center gap-3 py-8">
      <View className="w-14 h-14 rounded-full bg-status-info/10 items-center justify-center">
        <Moon size={26} color={colors.statusInfo} strokeWidth={1.8} />
      </View>
      <AppText variant="heading">Jour de repos</AppText>
      <AppText variant="body" muted className="text-center px-4">
        Profite bien de ta récupération. Ton prochain entraînement est planifié.
      </AppText>
      <Pressable onPress={onViewProgram} className="mt-1 min-h-[44px] justify-center active:opacity-70">
        <AppText variant="body" className="text-accent font-semibold">Voir mon programme</AppText>
      </Pressable>
    </Card>
  );
}
