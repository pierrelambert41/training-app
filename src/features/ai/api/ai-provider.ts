import type { Exercise } from '@/types';
import type { AIContext } from '../types/ai-context';
import type {
  AIIntermediateOutput,
  BlockRegenerationContext,
  ProgramGenerationContext,
  ValidationContext,
} from '../types/ai-generation';
import type {
  BlockSummary,
  PlateauAnalysis,
  Recommendation,
  SessionSummary,
} from '../types/ai-responses';

/**
 * Contrat commun pour tous les providers IA (ADR-007, ADR-028).
 * Implémenté par ClaudeProvider et FallbackProvider.
 *
 * Méthodes d'interprétation : aucun provider ne lance d'exception vers l'UI,
 * les erreurs sont gérées en interne (fallback silencieux).
 *
 * Méthodes de génération (ADR-028) : retournent le schéma JSON intermédiaire
 * partagé — le service applique transformAIOutputToProgram ensuite, identique
 * pour les deux providers. ClaudeProvider peut throw (AIProviderError,
 * AIValidationExhaustedError) : le caller bascule alors sur FallbackProvider.
 */
export interface AIProvider {
  generateSessionSummary(context: AIContext): Promise<SessionSummary>;
  generateRecommendation(context: AIContext): Promise<Recommendation>;
  generateBlockSummary(context: AIContext): Promise<BlockSummary>;
  analyzePlateau(context: AIContext): Promise<PlateauAnalysis>;
  explainAdjustment(context: AIContext): Promise<string>;
  generateProgram(
    context: ProgramGenerationContext,
    catalogSnapshot: Exercise[],
    validationCtx: ValidationContext
  ): Promise<AIIntermediateOutput>;
  regenerateBlock(
    context: BlockRegenerationContext,
    catalogSnapshot: Exercise[],
    validationCtx: ValidationContext
  ): Promise<AIIntermediateOutput>;
}
