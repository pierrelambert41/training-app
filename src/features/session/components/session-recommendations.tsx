import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { Recommendation } from '@/types';
import { AppText } from '@/components/ui';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SessionStatus = 'progression' | 'maintien' | 'allegee' | 'deload' | string;

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

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

function StatusBadge({ status }: { status: SessionStatus }) {
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
// Load change row
// ---------------------------------------------------------------------------

type LoadChangeRowProps = {
  recommendation: Recommendation;
  exerciseName: string;
};

function actionArrow(action: Recommendation['action']): {
  symbol: string;
  color: string;
} {
  switch (action) {
    case 'increase':
      return { symbol: '↑', color: '#4ade80' };
    case 'decrease':
      return { symbol: '↓', color: '#fb923c' };
    default:
      return { symbol: '→', color: '#60a5fa' };
  }
}

function LoadChangeRow({ recommendation, exerciseName }: LoadChangeRowProps) {
  const arrow = actionArrow(recommendation.action);
  const currentLoad =
    typeof recommendation.metadata?.currentLoad === 'number'
      ? recommendation.metadata.currentLoad
      : null;
  const nextLoad = recommendation.nextLoad;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 4,
        gap: 8,
        minHeight: 44,
      }}
    >
      <AppText
        style={{ flex: 1, fontSize: 14, color: '#e5e7eb' }}
        numberOfLines={1}
      >
        {exerciseName}
      </AppText>
      <AppText style={{ fontSize: 13, color: '#9ca3af' }}>
        {currentLoad !== null ? `${currentLoad}kg` : '—'}
      </AppText>
      <AppText style={{ fontSize: 14, fontWeight: '700', color: arrow.color }}>
        {arrow.symbol}
      </AppText>
      <AppText style={{ fontSize: 13, fontWeight: '600', color: '#e5e7eb' }}>
        {nextLoad !== null ? `${nextLoad}kg` : '—'}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Plateau card
// ---------------------------------------------------------------------------

function PlateauCard({ recommendation }: { recommendation: Recommendation }) {
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

function DeloadSection({ recommendation }: { recommendation: Recommendation }) {
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const MAX_VISIBLE_LOAD_CHANGES = 5;

type SessionRecommendationsProps = {
  recommendations: Recommendation[];
  exercisesById: Map<string, { name: string; nameFr?: string | null }>;
  isLoading: boolean;
};

export function SessionRecommendations({
  recommendations,
  exercisesById,
  isLoading,
}: SessionRecommendationsProps) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
        <ActivityIndicator color="#60a5fa" />
        <AppText style={{ fontSize: 14, color: '#9ca3af' }}>Calcul en cours…</AppText>
      </View>
    );
  }

  const loadChangeRecs = recommendations.filter((r) => r.type === 'load_change');
  const plateauRecs = recommendations.filter((r) => r.type === 'plateau');
  const deloadRec = recommendations.find((r) => r.type === 'deload');

  if (recommendations.length === 0) {
    return null;
  }

  const sessionStatus =
    loadChangeRecs.length > 0
      ? (loadChangeRecs[0].metadata?.sessionStatus as SessionStatus | undefined) ?? 'maintien'
      : deloadRec
        ? 'deload'
        : 'maintien';

  const visibleLoadChanges = showAll
    ? loadChangeRecs
    : loadChangeRecs.slice(0, MAX_VISIBLE_LOAD_CHANGES);
  const hasMore = loadChangeRecs.length > MAX_VISIBLE_LOAD_CHANGES;

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', letterSpacing: 0.8 }}>
          PROCHAINE SÉANCE
        </AppText>
        <StatusBadge status={sessionStatus} />
      </View>

      {deloadRec && <DeloadSection recommendation={deloadRec} />}

      {plateauRecs.map((rec) => (
        <PlateauCard key={rec.id} recommendation={rec} />
      ))}

      {loadChangeRecs.length > 0 && (
        <View
          style={{
            backgroundColor: '#111827',
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}
        >
          {visibleLoadChanges.map((rec, idx) => {
            const exercise = rec.exerciseId ? exercisesById.get(rec.exerciseId) : null;
            const exerciseName =
              exercise?.nameFr ??
              exercise?.name ??
              (typeof rec.metadata?.exerciseName === 'string'
                ? rec.metadata.exerciseName
                : rec.exerciseId ?? '—');

            return (
              <View
                key={rec.id}
                style={
                  idx < visibleLoadChanges.length - 1
                    ? { borderBottomWidth: 1, borderBottomColor: '#1e2a45' }
                    : undefined
                }
              >
                <LoadChangeRow recommendation={rec} exerciseName={exerciseName} />
              </View>
            );
          })}

          {hasMore && !showAll && (
            <Pressable
              onPress={() => setShowAll(true)}
              style={{ alignItems: 'center', paddingVertical: 10, minHeight: 44 }}
              accessibilityLabel="Voir toutes les recommandations"
            >
              <AppText style={{ fontSize: 13, color: '#60a5fa' }}>
                Voir plus ({loadChangeRecs.length - MAX_VISIBLE_LOAD_CHANGES} exercices)
              </AppText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
