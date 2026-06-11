export type InsightSentiment = 'positive' | 'warning' | 'neutral';

const WARNING_PATTERNS = [
  'plateau',
  'baisse',
  'régression',
  'regression',
  'fatigue',
  'manqué',
  'manque',
  'stagnation',
  'douleur',
];

const POSITIVE_PATTERNS = [
  'pr ',
  'record',
  'progression',
  'progressé',
  'amélioration',
  'streak',
  '+',
];

/**
 * Infère le sentiment d'un recent_highlight de l'AIContextProfile pour
 * choisir la couleur de l'AIInsightBadge (TA-140). Heuristique par mots-clés,
 * 'neutral' par défaut. Pure.
 */
export function inferHighlightSentiment(text: string): InsightSentiment {
  const lower = ` ${text.toLowerCase()} `;
  if (WARNING_PATTERNS.some((p) => lower.includes(p))) return 'warning';
  if (POSITIVE_PATTERNS.some((p) => lower.includes(p))) return 'positive';
  return 'neutral';
}
