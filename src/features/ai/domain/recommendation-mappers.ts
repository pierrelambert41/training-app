import type { BlockSummary, SessionSummary } from '../types/ai-responses';

const RATINGS: ReadonlyArray<SessionSummary['overall_rating']> = [
  'poor',
  'average',
  'good',
  'excellent',
];

/**
 * Reconstruit une SessionSummary depuis une Recommendation persistée (TA-135) :
 * message = summary, le reste dans metadata. Pure, tolérante aux champs manquants.
 */
export function sessionSummaryFromRecommendation(
  message: string,
  metadata: Record<string, unknown>
): SessionSummary {
  const rating = RATINGS.includes(metadata.overall_rating as SessionSummary['overall_rating'])
    ? (metadata.overall_rating as SessionSummary['overall_rating'])
    : 'average';
  return {
    overall_rating: rating,
    summary: message,
    highlights: Array.isArray(metadata.highlights) ? (metadata.highlights as string[]) : [],
    concerns: Array.isArray(metadata.concerns) ? (metadata.concerns as string[]) : [],
    fatigue_note: typeof metadata.fatigue_note === 'string' ? metadata.fatigue_note : '',
    next_session_note:
      typeof metadata.next_session_note === 'string' ? metadata.next_session_note : '',
  };
}

/**
 * Reconstruit une BlockSummary depuis le metadata d'une Recommendation persistée (TA-138).
 */
export function blockSummaryFromMetadata(metadata: Record<string, unknown>): BlockSummary {
  return {
    title: typeof metadata.title === 'string' ? metadata.title : '',
    duration_weeks: typeof metadata.duration_weeks === 'number' ? metadata.duration_weeks : 0,
    overall_assessment:
      typeof metadata.overall_assessment === 'string' ? metadata.overall_assessment : '',
    top_progressions: Array.isArray(metadata.top_progressions)
      ? (metadata.top_progressions as string[])
      : [],
    stagnations: Array.isArray(metadata.stagnations) ? (metadata.stagnations as string[]) : [],
    compliance_note: typeof metadata.compliance_note === 'string' ? metadata.compliance_note : '',
    next_block_recommendation:
      typeof metadata.next_block_recommendation === 'string'
        ? metadata.next_block_recommendation
        : '',
  };
}
