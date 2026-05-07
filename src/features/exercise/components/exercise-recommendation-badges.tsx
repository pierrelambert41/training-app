import { View } from 'react-native';
import { AppText } from '@/components/ui';
import type { Recommendation, RecommendationAction } from '@/types';

type Props = {
  latestLoadReco: Recommendation | null;
  latestPlateauReco: Recommendation | null;
};

const ACTION_CONFIG: Record<
  RecommendationAction,
  { label: string; icon: string; containerClass: string; textClass: string }
> = {
  increase: {
    label: 'Progression',
    icon: '↑',
    containerClass: 'bg-status-success/20 border border-status-success/40',
    textClass: 'text-status-success',
  },
  maintain: {
    label: 'Maintien',
    icon: '↔',
    containerClass: 'bg-background-elevated border border-border-strong',
    textClass: 'text-content-secondary',
  },
  decrease: {
    label: 'Régression',
    icon: '↓',
    containerClass: 'bg-status-warning/20 border border-status-warning/40',
    textClass: 'text-status-warning',
  },
  deload: {
    label: 'Deload',
    icon: '↓',
    containerClass: 'bg-status-warning/20 border border-status-warning/40',
    textClass: 'text-status-warning',
  },
  replace: {
    label: 'Remplacer',
    icon: '↔',
    containerClass: 'bg-background-elevated border border-border-strong',
    textClass: 'text-content-secondary',
  },
};

const PLATEAU_WINDOW_DAYS = 14;

function isRecentPlateau(rec: Recommendation): boolean {
  const created = new Date(rec.createdAt);
  const now = new Date();
  const diffDays = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < PLATEAU_WINDOW_DAYS;
}

export function ExerciseRecommendationBadges({ latestLoadReco, latestPlateauReco }: Props) {
  const hasProgressionBadge = latestLoadReco?.action != null;
  const hasPlateauBadge = latestPlateauReco != null && isRecentPlateau(latestPlateauReco);

  if (!hasProgressionBadge && !hasPlateauBadge) return null;

  return (
    <View className="flex-row flex-wrap gap-2" testID="exercise-recommendation-badges">
      {hasProgressionBadge && latestLoadReco?.action != null && (
        <View
          className={`flex-row items-center gap-1 self-start px-2.5 py-1 rounded-chip ${ACTION_CONFIG[latestLoadReco.action].containerClass}`}
          testID="exercise-progression-badge"
        >
          <AppText
            variant="caption"
            className={`font-bold ${ACTION_CONFIG[latestLoadReco.action].textClass}`}
          >
            {ACTION_CONFIG[latestLoadReco.action].icon}
          </AppText>
          <AppText
            variant="caption"
            className={`font-semibold ${ACTION_CONFIG[latestLoadReco.action].textClass}`}
          >
            {ACTION_CONFIG[latestLoadReco.action].label}
          </AppText>
        </View>
      )}

      {hasPlateauBadge && (
        <View
          className="flex-row items-center gap-1 self-start px-2.5 py-1 rounded-chip bg-status-error/20 border border-status-error/40"
          testID="exercise-plateau-badge"
        >
          <AppText variant="caption" className="font-semibold text-status-error">
            Plateau
          </AppText>
        </View>
      )}
    </View>
  );
}
