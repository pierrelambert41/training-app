/**
 * Types des réponses IA — conformes à docs/ai-strategy.md §4.
 * Ces types correspondent aux outputs de l'interface AIProvider (ADR-007).
 */

/**
 * Résumé fin de séance (generateSessionSummary).
 * Cf. ai-strategy.md §4 "Résumé fin de séance".
 */
export type SessionSummary = {
  overall_rating: 'poor' | 'average' | 'good' | 'excellent';
  summary: string;
  highlights: string[];
  concerns: string[];
  fatigue_note: string;
  next_session_note: string;
};

/**
 * Recommandation IA sur une séance ou un exercice (generateRecommendation).
 * Complète les recommandations du rules engine avec une interprétation en langage naturel.
 */
export type Recommendation = {
  message: string;
  action?: 'increase' | 'maintain' | 'decrease' | 'deload' | 'replace';
  confidence: number;
  rationale?: string;
};

/**
 * Synthèse d'un bloc terminé (generateBlockSummary).
 */
export type BlockSummary = {
  title: string;
  duration_weeks: number;
  overall_assessment: string;
  top_progressions: string[];
  stagnations: string[];
  compliance_note: string;
  next_block_recommendation: string;
};

/**
 * Analyse de plateau sur un exercice (analyzePlateau).
 * Cf. ai-strategy.md §4 "Analyse de plateau".
 */
export type PlateauAnalysis = {
  exercise: string;
  plateau_duration_weeks: number;
  probable_causes: string[];
  suggestions: string[];
};
