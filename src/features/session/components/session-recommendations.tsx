import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import type { Recommendation } from '@/types';
import { AppText } from '@/components/ui';
import {
  DeloadSection,
  PlateauCard,
  StatusBadge,
  type SessionStatus,
} from './session-recommendation-cards';
import { RecommendationWhy } from './recommendation-why';
import { colors } from '@/theme/tokens';

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
      return { symbol: '↑', color: colors.statusSuccess };
    case 'decrease':
      return { symbol: '↓', color: colors.statusWarning };
    default:
      return { symbol: '→', color: colors.statusInfo };
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
        style={{ flex: 1, fontSize: 14, color: colors.contentPrimary }}
        numberOfLines={1}
      >
        {exerciseName}
      </AppText>
      <AppText style={{ fontSize: 13, color: colors.contentSecondary }}>
        {currentLoad !== null ? `${currentLoad}kg` : '—'}
      </AppText>
      <AppText style={{ fontSize: 14, fontWeight: '700', color: arrow.color }}>
        {arrow.symbol}
      </AppText>
      <AppText style={{ fontSize: 13, fontWeight: '600', color: colors.contentPrimary }}>
        {nextLoad !== null ? `${nextLoad}kg` : '—'}
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
  /** Si fourni, affiche le bouton "Pourquoi ?" (explication IA TA-136) sous chaque recommandation */
  userId?: string;
};

export function SessionRecommendations({
  recommendations,
  exercisesById,
  isLoading,
  userId,
}: SessionRecommendationsProps) {
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return (
      <View style={{ alignItems: 'center', paddingVertical: 20, gap: 8 }}>
        <ActivityIndicator color={colors.statusInfo} />
        <AppText style={{ fontSize: 14, color: colors.contentSecondary }}>Calcul en cours…</AppText>
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
        <AppText style={{ fontSize: 12, fontWeight: '600', color: colors.contentMuted, letterSpacing: 0.8 }}>
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
            backgroundColor: colors.backgroundSurface,
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
                    ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                    : undefined
                }
              >
                <LoadChangeRow recommendation={rec} exerciseName={exerciseName} />
                {userId !== undefined && (
                  <RecommendationWhy recommendationId={rec.id} userId={userId} />
                )}
              </View>
            );
          })}

          {hasMore && !showAll && (
            <Pressable
              onPress={() => setShowAll(true)}
              style={{ alignItems: 'center', paddingVertical: 10, minHeight: 44 }}
              accessibilityLabel="Voir toutes les recommandations"
            >
              <AppText style={{ fontSize: 13, color: colors.statusInfo }}>
                Voir plus ({loadChangeRecs.length - MAX_VISIBLE_LOAD_CHANGES} exercices)
              </AppText>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
