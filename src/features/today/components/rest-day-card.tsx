import { Pressable } from 'react-native';
import { Card, AppText } from '@/components/ui';
import { dayOrderToFrenchName } from '../domain/next-workout-day';
import type { NextWorkoutDay } from '../domain/next-workout-day';

type Props = {
  onViewProgram: () => void;
  nextWorkoutDay: NextWorkoutDay | null;
};

export function RestDayCard({ onViewProgram, nextWorkoutDay }: Props) {
  return (
    <Card elevation="default" className="items-center gap-3 py-6">
      <AppText variant="heading">Jour de repos</AppText>
      {nextWorkoutDay ? (
        <AppText variant="body" muted className="text-center">
          {`Prochaine séance : ${nextWorkoutDay.title} — ${dayOrderToFrenchName(nextWorkoutDay.dayOrder)}`}
        </AppText>
      ) : (
        <AppText variant="body" muted className="text-center">
          Profite bien de ta recuperation. Ton prochain entrainement est planifie.
        </AppText>
      )}
      <Pressable onPress={onViewProgram} className="mt-1 min-h-[44px] justify-center">
        <AppText variant="body" className="text-accent font-semibold">Voir mon programme</AppText>
      </Pressable>
    </Card>
  );
}
