import { View } from 'react-native';
import { CalendarClock, Flame, Gauge } from 'lucide-react-native';
import { StatTile } from '@/components/ui';
import type { Session } from '@/types/session';

type Props = {
  streak: number;
  fatigueScore: number | null;
  lastSession: Session | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/** Rangée de 3 tuiles : streak, fatigue, dernière séance. */
export function TodayStatsRow({ streak, fatigueScore, lastSession }: Props) {
  const fatigueTone = fatigueScore !== null && fatigueScore >= 7
    ? 'danger'
    : fatigueScore !== null && fatigueScore >= 4
      ? 'warning'
      : 'neutral';

  return (
    <View className="flex-row gap-3">
      <StatTile
        icon={Flame}
        value={String(streak)}
        label={`séance${streak > 1 ? 's' : ''} d'affilée`}
        tone="accent"
        testID="stat-streak"
      />
      <StatTile
        icon={Gauge}
        value={fatigueScore !== null ? `${fatigueScore}/10` : '—'}
        label="fatigue"
        tone={fatigueTone}
        testID="stat-fatigue"
      />
      <StatTile
        icon={CalendarClock}
        value={lastSession?.date ? formatDate(lastSession.date) : '—'}
        label="dernière séance"
        tone="neutral"
        testID="stat-last-session"
      />
    </View>
  );
}
