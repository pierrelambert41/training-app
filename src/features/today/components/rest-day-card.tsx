import { Pressable } from 'react-native';
import { Card, AppText } from '@/components/ui';

type Props = {
  onViewProgram: () => void;
};

export function RestDayCard({ onViewProgram }: Props) {
  return (
    <Card elevation="default" className="items-center gap-3 py-6">
      <AppText variant="heading">Jour de repos</AppText>
      <AppText variant="body" muted className="text-center">
        Profite bien de ta recuperation. Ton prochain entrainement est planifie.
      </AppText>
      <Pressable onPress={onViewProgram} className="mt-1 min-h-[44px] justify-center">
        <AppText variant="body" className="text-accent font-semibold">Voir mon programme</AppText>
      </Pressable>
    </Card>
  );
}
