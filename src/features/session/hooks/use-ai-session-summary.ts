import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { getRecommendationsBySession } from '@/services/recommendations';
import type { SessionSummary } from '@/features/ai';
import type { Recommendation } from '@/types';

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 30_000;

const RATINGS: ReadonlyArray<SessionSummary['overall_rating']> = [
  'poor',
  'average',
  'good',
  'excellent',
];

/**
 * Reconstruit la SessionSummary depuis la Recommendation persistée par TA-135
 * (message = summary, le reste dans metadata).
 */
export function toSessionSummaryFromRecommendation(rec: Recommendation): SessionSummary {
  const md = rec.metadata;
  const rating = RATINGS.includes(md.overall_rating as SessionSummary['overall_rating'])
    ? (md.overall_rating as SessionSummary['overall_rating'])
    : 'average';
  return {
    overall_rating: rating,
    summary: rec.message,
    highlights: Array.isArray(md.highlights) ? (md.highlights as string[]) : [],
    concerns: Array.isArray(md.concerns) ? (md.concerns as string[]) : [],
    fatigue_note: typeof md.fatigue_note === 'string' ? md.fatigue_note : '',
    next_session_note: typeof md.next_session_note === 'string' ? md.next_session_note : '',
  };
}

/**
 * Sélectionne le résumé de *séance* parmi les recommandations :
 * type 'summary' source 'ai', en excluant le résumé de *bloc* TA-138
 * (même type/source mais discriminé par metadata.block_id).
 */
export function findSessionSummaryRecommendation(
  recs: Recommendation[]
): Recommendation | null {
  return (
    recs.find(
      (r) => r.type === 'summary' && r.source === 'ai' && r.metadata.block_id === undefined
    ) ?? null
  );
}

export type AISessionSummaryState = {
  summary: SessionSummary | null;
  /** true tant que le résumé n'est pas arrivé et que la fenêtre de polling court */
  isPolling: boolean;
  /** true si la fenêtre de 30s est écoulée sans résumé persisté */
  timedOut: boolean;
};

/**
 * Lit le SessionSummary IA persisté par TA-135 (Recommendation type 'summary' source 'ai').
 *
 * Le résumé arrive de façon différée (généré post-complétion, fire-and-forget) :
 * polling refetchInterval 3s pendant 30s max après activation, puis arrêt —
 * l'écran affiche alors le résumé minimal local (cf. TA-139).
 */
export function useAISessionSummary(
  sessionId: string | null,
  enabled: boolean
): AISessionSummaryState {
  const db = useDB();
  const pollStartedAtRef = useRef<number | null>(null);

  if (enabled && pollStartedAtRef.current === null) {
    pollStartedAtRef.current = Date.now();
  }

  const { data } = useQuery<Recommendation | null>({
    queryKey: ['session-ai-summary', sessionId],
    queryFn: async () => findSessionSummaryRecommendation(
      await getRecommendationsBySession(db, sessionId!)
    ),
    enabled: enabled && !!sessionId,
    refetchInterval: (query) => {
      if (query.state.data) return false;
      const startedAt = pollStartedAtRef.current;
      if (startedAt !== null && Date.now() - startedAt >= POLL_TIMEOUT_MS) return false;
      return POLL_INTERVAL_MS;
    },
  });

  const summary = data ? toSessionSummaryFromRecommendation(data) : null;
  const startedAt = pollStartedAtRef.current;
  const timedOut =
    summary === null && startedAt !== null && Date.now() - startedAt >= POLL_TIMEOUT_MS;

  return {
    summary,
    isPolling: enabled && summary === null && !timedOut,
    timedOut,
  };
}
