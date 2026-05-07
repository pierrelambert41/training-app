import { View } from 'react-native';
import { AppText } from '@/components/ui';
import type { ExerciseSessionHistory } from '../types/exercise-history';

type Props = {
  history: ExerciseSessionHistory[];
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatBestSet(bestSet: ExerciseSessionHistory['bestSet']): string {
  const parts: string[] = [];
  if (bestSet.load !== null) parts.push(`${bestSet.load} kg`);
  if (bestSet.reps !== null) parts.push(`${bestSet.reps} reps`);
  if (bestSet.rir !== null) parts.push(`@ RIR ${bestSet.rir}`);
  return parts.length > 0 ? parts.join(' × ') : '—';
}

function HistoryRow({ entry }: { entry: ExerciseSessionHistory }) {
  return (
    <View
      className="flex-row items-center justify-between py-2.5 border-b border-border"
      testID={`history-row-${entry.sessionId}`}
    >
      <AppText variant="caption" muted className="w-20">
        {formatDate(entry.date)}
      </AppText>
      <AppText variant="caption" className="flex-1 text-right text-content-primary">
        {formatBestSet(entry.bestSet)}
      </AppText>
    </View>
  );
}

export function ExerciseHistorySection({ history }: Props) {
  if (history.length === 0) {
    return (
      <View testID="exercise-history-empty">
        <AppText variant="caption" muted>
          Pas encore logué
        </AppText>
      </View>
    );
  }

  return (
    <View testID="exercise-history-list">
      {history.map((entry) => (
        <HistoryRow key={entry.sessionId} entry={entry} />
      ))}
    </View>
  );
}
