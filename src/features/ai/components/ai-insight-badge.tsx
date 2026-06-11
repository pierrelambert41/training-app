import { View } from 'react-native';
import { AppText } from '@/components/ui';
import type { InsightSentiment } from '../domain/highlight-sentiment';

type AIInsightBadgeProps = {
  text: string;
  sentiment: InsightSentiment;
};

function sentimentStyle(sentiment: InsightSentiment): {
  bg: string;
  text: string;
  icon: string;
} {
  switch (sentiment) {
    case 'positive':
      return { bg: '#14532d', text: '#4ade80', icon: '↗' };
    case 'warning':
      return { bg: '#3b2f10', text: '#fbbf24', icon: '⚠' };
    default:
      return { bg: '#1f2937', text: '#9ca3af', icon: '✦' };
  }
}

/**
 * Badge compact pour un fait saillant IA (TA-140) — ex: "PR bench ce mois".
 * Utilisé pour les recent_highlights de l'AIContextProfile sur l'écran Aujourd'hui.
 */
export function AIInsightBadge({ text, sentiment }: AIInsightBadgeProps) {
  const style = sentimentStyle(sentiment);
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        backgroundColor: style.bg,
        alignSelf: 'flex-start',
      }}
      testID={`ai-insight-badge-${sentiment}`}
    >
      <AppText style={{ fontSize: 11, color: style.text }}>{style.icon}</AppText>
      <AppText style={{ fontSize: 12, fontWeight: '600', color: style.text }} numberOfLines={1}>
        {text}
      </AppText>
    </View>
  );
}
