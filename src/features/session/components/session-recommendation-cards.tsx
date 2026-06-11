import { View } from 'react-native';
import type { Recommendation } from '@/types';
import { AppText } from '@/components/ui';

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
      return { bg: '#14532d', text: '#4ade80', label: 'Progression' };
    case 'maintien':
      return { bg: '#1e3a5f', text: '#60a5fa', label: 'Maintien' };
    case 'allegee':
      return { bg: '#431407', text: '#fb923c', label: 'Allégée' };
    case 'deload':
      return { bg: '#450a0a', text: '#f87171', label: 'Deload' };
    default:
      return { bg: '#1f2937', text: '#9ca3af', label: status };
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
        backgroundColor: '#451a03',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#f59e0b',
      }}
    >
      <AppText style={{ fontSize: 13, fontWeight: '700', color: '#fbbf24', marginBottom: 4 }}>
        Plateau détecté
      </AppText>
      <AppText style={{ fontSize: 13, color: '#fde68a' }} numberOfLines={2}>
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
        backgroundColor: '#450a0a',
        borderRadius: 10,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: '#ef4444',
      }}
    >
      <AppText style={{ fontSize: 13, fontWeight: '700', color: '#f87171', marginBottom: 4 }}>
        Deload recommandé
      </AppText>
      <AppText style={{ fontSize: 13, color: '#fca5a5' }} numberOfLines={3}>
        {recommendation.message}
      </AppText>
    </View>
  );
}
