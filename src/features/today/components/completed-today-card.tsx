import { View } from 'react-native';
import { Card, AppText } from '@/components/ui';
import type { CompletedTodayData } from '@/features/today/types/completed-today-data';

type Props = {
  data: CompletedTodayData;
};

function formatDurationMin(startedAt: string | null, endedAt: string | null): string | null {
  if (!startedAt || !endedAt) return null;
  const diffMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
  if (diffMs <= 0) return null;
  const minutes = Math.round(diffMs / 60000);
  return `${minutes} min`;
}

function formatScore(score: number | null): string {
  if (score === null) return '—';
  return `${Math.round(score * 100)} %`;
}

export function CompletedTodayCard({ data }: Props) {
  const { workoutDay, completedSession } = data;
  const duration = formatDurationMin(completedSession.startedAt, completedSession.endedAt);
  const score = formatScore(completedSession.completionScore);

  return (
    <Card elevation="elevated" className="gap-3 border border-status-success">
      <View className="flex-row items-center justify-between gap-2">
        <View className="flex-1 gap-1">
          <AppText variant="heading">{workoutDay.title}</AppText>
          <AppText variant="caption" className="text-status-success">
            Séance du jour — Terminée
          </AppText>
        </View>
        <View className="items-center justify-center w-10 h-10 rounded-full bg-status-success/20">
          <AppText variant="body" className="text-status-success">✓</AppText>
        </View>
      </View>

      <View className="flex-row gap-4">
        {duration ? (
          <View className="gap-0.5">
            <AppText variant="caption" muted>Durée</AppText>
            <AppText variant="body" className="font-semibold">{duration}</AppText>
          </View>
        ) : null}
        <View className="gap-0.5">
          <AppText variant="caption" muted>Complétion</AppText>
          <AppText variant="body" className="font-semibold">{score}</AppText>
        </View>
      </View>
    </Card>
  );
}
