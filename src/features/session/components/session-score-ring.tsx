import { useMemo } from 'react';
import { View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

export function ScoreRing({ score }: { score: number }) {
  const pct = score / 10;

  const ringColor = useMemo(() => {
    if (score >= 8) return colors.statusSuccess;
    if (score >= 6) return colors.statusInfo;
    if (score >= 4) return colors.statusWarning;
    if (score >= 2) return colors.statusWarning;
    return colors.statusDanger;
  }, [score]);

  return (
    <View className="items-center justify-center" style={{ width: 160, height: 160 }}>
      <View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          borderWidth: 10,
          borderColor: colors.border,
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
          borderRightColor: pct >= 0.25 ? ringColor : colors.border,
          borderBottomColor: pct >= 0.5 ? ringColor : colors.border,
          borderLeftColor: pct >= 0.75 ? ringColor : colors.border,
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
    achievement >= 1 ? colors.statusSuccess : achievement >= 0.7 ? colors.statusWarning : colors.statusDanger;
  return (
    <View
      style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }}
    />
  );
}

export function StatPill({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View
      className="flex-1 items-center py-3 rounded-card"
      style={{ backgroundColor: colors.backgroundSurface }}
      testID={testID}
    >
      <AppText style={{ fontSize: 22, fontWeight: '700', color: colors.contentPrimary }}>
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
