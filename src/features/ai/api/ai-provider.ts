import type { AIContext } from '../types/ai-context';
import type {
  BlockSummary,
  PlateauAnalysis,
  Recommendation,
  SessionSummary,
} from '../types/ai-responses';

/**
 * Contrat commun pour tous les providers IA (ADR-007).
 * Implémenté par ClaudeProvider et FallbackProvider.
 * Aucun provider ne lance d'exception vers l'UI : les erreurs sont gérées en interne.
 */
export interface AIProvider {
  generateSessionSummary(context: AIContext): Promise<SessionSummary>;
  generateRecommendation(context: AIContext): Promise<Recommendation>;
  generateBlockSummary(context: AIContext): Promise<BlockSummary>;
  analyzePlateau(context: AIContext): Promise<PlateauAnalysis>;
  explainAdjustment(context: AIContext): Promise<string>;
}
