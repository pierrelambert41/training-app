import { View } from 'react-native';
import { Sparkles, TrendingUp, TriangleAlert } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { InsightSentiment } from '../domain/highlight-sentiment';

type AIInsightBadgeProps = {
  text: string;
  sentiment: InsightSentiment;
};

function sentimentStyle(sentiment: InsightSentiment): {
  bg: string;
  text: string;
  icon: LucideIcon;
} {
  switch (sentiment) {
    case 'positive':
      return { bg: colors.tintSuccess, text: colors.statusSuccess, icon: TrendingUp };
    case 'warning':
      return { bg: colors.tintWarning, text: colors.statusWarning, icon: TriangleAlert };
    default:
      return { bg: colors.backgroundElevated, text: colors.contentSecondary, icon: Sparkles };
  }
}

/**
 * Badge compact pour un fait saillant IA (TA-140) — ex: "PR bench ce mois".
 * Utilisé pour les recent_highlights de l'AIContextProfile sur l'écran Aujourd'hui.
 */
export function AIInsightBadge({ text, sentiment }: AIInsightBadgeProps) {
  const style = sentimentStyle(sentiment);
  const Icon = style.icon;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 999,
        backgroundColor: style.bg,
        alignSelf: 'flex-start',
      }}
      testID={`ai-insight-badge-${sentiment}`}
    >
      <Icon size={12} color={style.text} strokeWidth={2.4} />
      <AppText style={{ fontSize: 12, fontWeight: '600', color: style.text }} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}
