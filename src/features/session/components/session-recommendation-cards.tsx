import { View } from 'react-native';
import type { Recommendation } from '@/types';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

export type SessionStatus = 'progression' | 'maintien' | 'allegee' | 'deload' | string;

function statusBadgeStyle(status: SessionStatus): {
  bg: string;
  text: string;
  label: string;
} {
  switch (status) {
    case 'progression':
      return { bg: colors.tintSuccess, text: colors.statusSuccess, label: 'Progression' };
    case 'maintien':
      return { bg: colors.tintInfo, text: colors.statusInfo, label: 'Maintien' };
    case 'allegee':
      return { bg: colors.tintWarning, text: colors.statusWarning, label: 'Allégée' };
    case 'deload':
      return { bg: colors.tintDanger, text: colors.statusDanger, label: 'Deload' };
    default:
      return { bg: colors.backgroundElevated, text: colors.contentSecondary, label: status };
  }
}

export function StatusBadge({ status }: { status: SessionStatus }) {
  const style = statusBadgeStyle(status);
  return (
    <View
      style={{
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: style.bg,
        alignSelf: 'flex-start',
      }}
    >
      <AppText style={{ fontSize: 13, fontWeight: '600', color: style.text }}>
        {style.label}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Plateau card
// ---------------------------------------------------------------------------

export function PlateauCard({ recommendation }: { recommendation: Recommendation }) {
  const firstAction =
    Array.isArray(recommendation.metadata?.recommendations) &&
    recommendation.metadata.recommendations.length > 0
      ? (recommendation.metadata.recommendations[0] as { message?: string })
          .message
      : recommendation.message;

  return (
    <View
      style={{
        backgroundColor: colors.tintWarning,
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.statusWarning,
      }}
    >
      <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.statusWarning, marginBottom: 4 }}>
        Plateau détecté
      </AppText>
      <AppText style={{ fontSize: 13, color: colors.statusWarning }} numberOfLines={2}>
        {firstAction}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Deload section
// ---------------------------------------------------------------------------

export function DeloadSection({ recommendation }: { recommendation: Recommendation }) {
  return (
    <View
      style={{
        backgroundColor: colors.tintDanger,
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.statusDanger,
      }}
    >
      <AppText style={{ fontSize: 13, fontWeight: '700', color: colors.statusDanger, marginBottom: 4 }}>
        Deload recommandé
      </AppText>
      <AppText style={{ fontSize: 13, color: colors.statusDanger }} numberOfLines={3}>
        {recommendation.message}
      </AppText>
    </View>
  );
}
