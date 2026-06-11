import { View } from 'react-native';
import { Check, Clock, Target } from 'lucide-react-native';
import { Card, AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
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
    <Card elevation="elevated" className="gap-4">
      <View className="flex-row items-center gap-3">
        <View className="items-center justify-center w-11 h-11 rounded-full bg-status-success/15">
          <Check size={22} color={colors.statusSuccess} strokeWidth={2.6} />
        </View>
        <View className="flex-1 gap-0.5">
          <AppText variant="caption" className="text-status-success font-bold uppercase" style={{ letterSpacing: 1.2 }}>
            Séance terminée
          </AppText>
          <AppText variant="heading">{workoutDay.title}</AppText>
        </View>
      </View>

      <View className="flex-row gap-3">
        {duration ? (
          <View className="flex-1 flex-row items-center gap-2 bg-background/60 rounded-card px-3 py-2.5">
            <Clock size={15} color={colors.contentMuted} />
            <View>
              <AppText variant="body" className="font-bold">{duration}</AppText>
              <AppText variant="caption" muted>durée</AppText>
            </View>
          </View>
        ) : null}
        <View className="flex-1 flex-row items-center gap-2 bg-background/60 rounded-card px-3 py-2.5">
          <Target size={15} color={colors.contentMuted} />
          <View>
            <AppText variant="body" className="font-bold">{score}</AppText>
            <AppText variant="caption" muted>complétion</AppText>
          </View>
        </View>
      </View>
    </Card>
  );
}
