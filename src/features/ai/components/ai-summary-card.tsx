import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Sparkles, Star } from 'lucide-react-native';
import { AppText } from '@/components/ui';
import type { BlockSummary, SessionSummary } from '../types/ai-responses';
import { colors } from '@/theme/tokens';

const COLLAPSE_THRESHOLD_CHARS = 140;
const MAX_CONDENSED_HIGHLIGHTS = 2;
const AI_ACCENT = colors.aiAccent;

type AISummaryCardProps =
  | { type: 'session'; summary: SessionSummary | null }
  | { type: 'block'; summary: BlockSummary | null };

function ratingStyle(rating: SessionSummary['overall_rating']): {
  bg: string;
  text: string;
  label: string;
} {
  switch (rating) {
    case 'excellent':
      return { bg: colors.tintSuccess, text: colors.statusSuccess, label: 'Excellente' };
    case 'good':
      return { bg: colors.tintInfo, text: colors.statusInfo, label: 'Bonne' };
    case 'poor':
      return { bg: colors.tintWarning, text: colors.statusWarning, label: 'Difficile' };
    default:
      return { bg: colors.tintWarning, text: colors.statusWarning, label: 'Correcte' };
  }
}

function RatingBadge({ rating }: { rating: SessionSummary['overall_rating'] }) {
  const style = ratingStyle(rating);
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        backgroundColor: style.bg,
      }}
      testID="ai-summary-card-rating"
    >
      <AppText style={{ fontSize: 12, fontWeight: '700', color: style.text }}>
        {style.label}
      </AppText>
    </View>
  );
}

function CollapsibleText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > COLLAPSE_THRESHOLD_CHARS;

  return (
    <View style={{ gap: 4 }}>
      <AppText
        style={{ fontSize: 14, color: colors.contentPrimary, lineHeight: 20 }}
        numberOfLines={expanded || !needsToggle ? undefined : 3}
      >
        {text}
      </AppText>
      {needsToggle && (
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Réduire le résumé' : 'Voir le résumé complet'}
          testID="ai-summary-card-toggle"
        >
          <AppText style={{ fontSize: 13, color: AI_ACCENT }}>
            {expanded ? 'Voir moins' : 'Voir plus'}
          </AppText>
        </Pressable>
      )}
    </View>
  );
}

function CondensedHighlights({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 4 }} testID="ai-summary-card-highlights">
      {items.slice(0, MAX_CONDENSED_HIGHLIGHTS).map((item, idx) => (
        <View key={idx} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
          <View style={{ marginTop: 2 }}>
            <Star size={13} color={colors.statusSuccess} fill={colors.statusSuccess} />
          </View>
          <AppText
            style={{ flex: 1, fontSize: 13, color: colors.contentSecondary, lineHeight: 18 }}
            numberOfLines={1}
          >
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * Carte de résumé IA réutilisable (TA-140) — SessionSummary ou BlockSummary.
 * Identité visuelle IA : liseré violet + ✦, distincte des cartes rules-engine.
 * Texte > 3 lignes : collapse avec "Voir plus". Rien n'est rendu si summary est null.
 */
export function AISummaryCard(props: AISummaryCardProps) {
  if (props.summary === null) return null;

  const isSession = props.type === 'session';
  const headerLabel = isSession ? 'Résumé IA' : props.summary.title || 'Bilan du bloc';
  const text = isSession ? props.summary.summary : props.summary.overall_assessment;
  const highlights = isSession ? props.summary.highlights : props.summary.top_progressions;
  const footnote = isSession ? null : props.summary.compliance_note || null;

  return (
    <View
      style={{
        backgroundColor: colors.backgroundSurface,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderLeftWidth: 3,
        borderLeftColor: AI_ACCENT,
        padding: 14,
        gap: 10,
      }}
      testID="ai-summary-card"
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Sparkles size={13} color={AI_ACCENT} />
          <AppText
            style={{ fontSize: 12, fontWeight: '600', color: colors.contentSecondary, letterSpacing: 0.6 }}
            numberOfLines={1}
          >
            {headerLabel.toUpperCase()}
          </AppText>
        </View>
        {isSession && <RatingBadge rating={props.summary.overall_rating} />}
      </View>

      {text !== '' && <CollapsibleText text={text} />}

      <CondensedHighlights items={highlights} />

      {footnote !== null && footnote !== '' && (
        <AppText style={{ fontSize: 12, color: colors.contentMuted }}>{footnote}</AppText>
      )}
    </View>
  );
}
