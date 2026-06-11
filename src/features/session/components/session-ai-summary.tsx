import { View } from 'react-native';
import { AppText } from '@/components/ui';
import type { SessionSummary } from '@/features/ai';

// ---------------------------------------------------------------------------
// Rating badge — grande police, premier élément de la hiérarchie visuelle
// ---------------------------------------------------------------------------

function ratingStyle(rating: SessionSummary['overall_rating']): {
  bg: string;
  text: string;
  label: string;
} {
  switch (rating) {
    case 'excellent':
      return { bg: '#14532d', text: '#4ade80', label: 'Excellente' };
    case 'good':
      return { bg: '#1e3a5f', text: '#60a5fa', label: 'Bonne' };
    case 'poor':
      return { bg: '#431407', text: '#fb923c', label: 'Difficile' };
    default:
      return { bg: '#3b2f10', text: '#fbbf24', label: 'Correcte' };
  }
}

function RatingBadge({ rating }: { rating: SessionSummary['overall_rating'] }) {
  const style = ratingStyle(rating);
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: style.bg,
        alignSelf: 'flex-start',
      }}
      testID="ai-summary-rating-badge"
    >
      <AppText style={{ fontSize: 16, fontWeight: '700', color: style.text }}>
        {style.label}
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Skeleton — le résumé IA arrive de façon asynchrone post-complétion
// ---------------------------------------------------------------------------

function SkeletonBar({ width }: { width: `${number}%` }) {
  return (
    <View
      style={{
        height: 14,
        width,
        borderRadius: 7,
        backgroundColor: '#1f2937',
      }}
    />
  );
}

function SummarySkeleton() {
  return (
    <View style={{ gap: 10 }} testID="ai-summary-skeleton">
      <SkeletonBar width="35%" />
      <SkeletonBar width="100%" />
      <SkeletonBar width="90%" />
      <SkeletonBar width="60%" />
      <AppText className="text-caption text-content-muted">
        Génération du résumé en cours…
      </AppText>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Listes highlights / concerns
// ---------------------------------------------------------------------------

function BulletList({
  items,
  icon,
  color,
  testID,
}: {
  items: string[];
  icon: string;
  color: string;
  testID: string;
}) {
  if (items.length === 0) return null;
  return (
    <View style={{ gap: 6 }} testID={testID}>
      {items.map((item, idx) => (
        <View key={idx} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <AppText style={{ fontSize: 14, color, lineHeight: 20 }}>{icon}</AppText>
          <AppText style={{ flex: 1, fontSize: 14, color: '#e5e7eb', lineHeight: 20 }}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type SessionAISummaryProps = {
  summary: SessionSummary | null;
  isPolling: boolean;
  /** Résumé minimal local si l'IA est indisponible et qu'aucun fallback n'est persisté */
  fallbackText: string;
};

/**
 * Section "résumé de séance" de l'écran de fin (TA-139).
 * Hiérarchie : rating (badge, grande police) → résumé → highlights → concerns → note prochaine séance.
 * Skeleton pendant la génération asynchrone, résumé minimal local après timeout.
 */
export function SessionAISummary({ summary, isPolling, fallbackText }: SessionAISummaryProps) {
  return (
    <View style={{ gap: 12 }}>
      <AppText style={{ fontSize: 12, fontWeight: '600', color: '#6b7280', letterSpacing: 0.8 }}>
        RÉSUMÉ DE SÉANCE
      </AppText>

      <View
        style={{
          backgroundColor: '#111827',
          borderRadius: 12,
          borderCurve: 'continuous',
          padding: 16,
          gap: 14,
        }}
      >
        {isPolling ? (
          <SummarySkeleton />
        ) : summary ? (
          <>
            <RatingBadge rating={summary.overall_rating} />
            <AppText style={{ fontSize: 15, color: '#e5e7eb', lineHeight: 22 }}>
              {summary.summary}
            </AppText>
            <BulletList
              items={summary.highlights}
              icon="★"
              color="#4ade80"
              testID="ai-summary-highlights"
            />
            <BulletList
              items={summary.concerns}
              icon="⚠"
              color="#fbbf24"
              testID="ai-summary-concerns"
            />
            {summary.next_session_note !== '' && (
              <AppText className="text-caption text-content-muted">
                {summary.next_session_note}
              </AppText>
            )}
          </>
        ) : (
          <AppText
            style={{ fontSize: 15, color: '#e5e7eb', lineHeight: 22 }}
            testID="ai-summary-fallback"
          >
            {fallbackText}
          </AppText>
        )}
      </View>
    </View>
  );
}
