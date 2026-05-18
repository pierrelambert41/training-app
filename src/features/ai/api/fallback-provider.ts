import type { AIContext } from '../types/ai-context';
import type {
  BlockSummary,
  PlateauAnalysis,
  Recommendation,
  SessionSummary,
} from '../types/ai-responses';
import type { AIProvider } from './ai-provider';

/**
 * Provider de secours sans appel réseau (ADR-007, ADR-026).
 * Retourne des résumés basiques générés par templates statiques.
 * Utilisé quand ClaudeProvider échoue ou quand explicitement demandé (tests/dev).
 */
export class FallbackProvider implements AIProvider {
  async generateSessionSummary(context: AIContext): Promise<SessionSummary> {
    const setCount = context.currentSession?.setLogs.reduce(
      (acc, ex) => acc + ex.sets.length,
      0
    ) ?? 0;
    const exerciseCount = context.currentSession?.setLogs.length ?? 0;
    return {
      overall_rating: 'average',
      summary: `Séance complétée. ${exerciseCount} exercice${exerciseCount > 1 ? 's' : ''}, ${setCount} série${setCount > 1 ? 's' : ''} enregistrée${setCount > 1 ? 's' : ''}.`,
      highlights: [],
      concerns: [],
      fatigue_note: 'Analyse IA indisponible.',
      next_session_note: 'Continuez selon le programme prévu.',
    };
  }

  async generateRecommendation(context: AIContext): Promise<Recommendation> {
    const hasRulesReco = context.rulesEngineRecommendations.length > 0;
    return {
      message: hasRulesReco
        ? context.rulesEngineRecommendations[0].message
        : 'Suivez les recommandations du programme.',
      confidence: 0.5,
    };
  }

  async generateBlockSummary(context: AIContext): Promise<BlockSummary> {
    const block = context.profile.current_block;
    return {
      title: block?.title ?? 'Bloc terminé',
      duration_weeks: block?.total_weeks ?? 0,
      overall_assessment: 'Bloc complété. Analyse IA indisponible.',
      top_progressions: [],
      stagnations: [],
      compliance_note: block
        ? `Taux de complétion : ${Math.round(block.compliance_rate * 100)}%.`
        : 'Données de complétion indisponibles.',
      next_block_recommendation: 'Consultez votre coach pour la suite.',
    };
  }

  async analyzePlateau(context: AIContext): Promise<PlateauAnalysis> {
    const firstHistory = context.exerciseHistory?.[0];
    return {
      exercise: firstHistory?.exerciseName ?? 'Exercice',
      plateau_duration_weeks: 0,
      probable_causes: ['Analyse IA indisponible.'],
      suggestions: ['Maintenez la régularité et consultez votre historique.'],
    };
  }

  async explainAdjustment(_context: AIContext): Promise<string> {
    return 'Ajustement recommandé par le moteur de progression. Analyse IA indisponible.';
  }
}
