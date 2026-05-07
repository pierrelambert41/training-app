import { useMemo } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui';

export function ScoreRing({ score }: { score: number }) {
  const pct = score / 10;

  const ringColor = useMemo(() => {
    if (score >= 8) return '#22c55e';
    if (score >= 6) return '#3b82f6';
    if (score >= 4) return '#f59e0b';
    if (score >= 2) return '#f97316';
    return '#ef4444';
  }, [score]);

  return (
    <View className="items-center justify-center" style={{ width: 160, height: 160 }}>
      <View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 10,
          borderColor: '#1e2a45',
          position: 'absolute',
        }}
      />
      <View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 10,
          borderColor: ringColor,
          borderRightColor: pct >= 0.25 ? ringColor : '#1e2a45',
          borderBottomColor: pct >= 0.5 ? ringColor : '#1e2a45',
          borderLeftColor: pct >= 0.75 ? ringColor : '#1e2a45',
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
          opacity: 0.9,
        }}
      />
      <View className="items-center gap-0.5">
        <AppText style={{ fontSize: 52, fontWeight: '800', color: ringColor, lineHeight: 58 }}>
          {score.toFixed(1)}
        </AppText>
        <AppText className="text-label text-content-secondary">/10</AppText>
      </View>
    </View>
  );
}

export function AchievementDot({ achievement }: { achievement: number }) {
  const color =
    achievement >= 1 ? '#22c55e' : achievement >= 0.7 ? '#f59e0b' : '#ef4444';
  return (
    <View
      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }}
    />
  );
}

export function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View
      className="flex-1 items-center py-3 rounded-card"
      style={{ backgroundColor: '#111827' }}
    >
      <AppText style={{ fontSize: 22, fontWeight: '700', color: '#f3f4f6' }}>
        {value}
      </AppText>
      <AppText className="text-caption text-content-muted mt-0.5">{label}</AppText>
    </View>
  );
}

export function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt) return '—';
  const end = endedAt ? new Date(endedAt).getTime() : Date.now();
  const secs = Math.floor((end - new Date(startedAt).getTime()) / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}`;
  return `${m}min`;
}
