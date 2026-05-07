import { View } from 'react-native';
import { Card, AppText } from '@/components/ui';
import type { Session } from '@/types/session';

type Props = {
  lastSession: Session | null;
  streak: number;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function MiniSummary({ lastSession, streak }: Props) {
  return (
    <View className="flex-row gap-3">
      <Card elevation="default" className="flex-1 gap-1">
        <AppText variant="caption" muted>Derniere seance</AppText>
        {lastSession ? (
          <AppText variant="body" className="font-semibold" numberOfLines={1}>
            {lastSession.date ? formatDate(lastSession.date) : '—'}
          </AppText>
        ) : (
          <AppText variant="body" muted>Aucune</AppText>
        )}
      </Card>
      <Card elevation="default" className="flex-1 gap-1">
        <AppText variant="caption" muted>Streak</AppText>
        <View className="flex-row items-baseline gap-1">
          <AppText variant="heading" className="text-accent">{streak}</AppText>
          <AppText variant="caption" muted>seance{streak > 1 ? 's' : ''}</AppText>
        </View>
      </Card>
    </View>
  );
}
