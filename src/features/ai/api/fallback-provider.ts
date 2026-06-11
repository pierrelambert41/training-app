import type { Exercise, GenerationAnswers, ProgramGoal } from '@/types';
import { generateProgram as runDeterministicEngine } from '@/services/program-generation';
import type { AIContext } from '../types/ai-context';
import type {
  BlockSummary,
  PlateauAnalysis,
  Recommendation,
  SessionSummary,
} from '../types/ai-responses';
import type {
  AIIntermediateOutput,
  BlockRegenerationContext,
  ProgramGenerationContext,
  ValidationContext,
} from '../types/ai-generation';
import { generationResultToIntermediate } from '../domain/generation-result-to-intermediate';
import type { AIProvider } from './ai-provider';

/** Le moteur Phase 3 exige goal/frequency/level non-null — défauts sûrs sinon. */
function emptyAnswers(): GenerationAnswers {
  return {
    goal: 'hypertrophy',
    frequencyDays: 3,
    preferredDays: null,
    level: 'intermediate',
    equipment: 'full_gym',
    injuries: '',
    avoidExercises: '',
    priorityMuscles: [],
    sportsParallel: '',
    maxSessionDurationMin: null,
    mixedPriority: null,
    volumeTolerance: null,
    importHistory: false,
    weightKg: '',
    heightCm: '',
    readinessAvg: null,
    attendancePercent: null,
  };
}

function blockGoalToProgramGoal(goal: string): ProgramGoal {
  if (goal === 'strength' || goal === 'peaking') return 'strength';
  return 'hypertrophy';
}

function clampFrequency(days: number): 3 | 4 | 5 | 6 {
  if (days <= 3) return 3;
  if (days >= 6) return 6;
  return days as 4 | 5;
}

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

  // -------------------------------------------------------------------------
  // Génération de programme (ADR-028, TA-145) — wrapper du moteur Phase 3
  // -------------------------------------------------------------------------

  /**
   * Garantie "l'app fonctionne sans IA" : le moteur déterministe 3-couches
   * produit le même schéma intermédiaire que ClaudeProvider — le service
   * applique ensuite le même transformer (source: 'fallback').
   *
   * Le moteur est pur (pas d'I/O réseau) : le Promise wrapper est trivial.
   */
  async generateProgram(
    context: ProgramGenerationContext,
    catalogSnapshot: Exercise[],
    _validationCtx: ValidationContext
  ): Promise<AIIntermediateOutput> {
    const result = await runDeterministicEngine({
      // Le schéma intermédiaire ne porte aucun id interne : userId factice.
      userId: 'fallback',
      answers: context.questionnaire,
      catalogue: catalogSnapshot,
    });
    return generationResultToIntermediate(result);
  }

  /**
   * Régénération du bloc suivant sans IA : ré-exécute le moteur Phase 3 avec
   * les paramètres reconstruits depuis le bloc précédent + le profil.
   * Pas de continuité 60-80% garantie (le moteur re-sélectionne par scoring) —
   * c'est le compromis assumé du mode dégradé.
   */
  async regenerateBlock(
    context: BlockRegenerationContext,
    catalogSnapshot: Exercise[],
    _validationCtx: ValidationContext
  ): Promise<AIIntermediateOutput> {
    const answers: GenerationAnswers = {
      ...emptyAnswers(),
      goal: blockGoalToProgramGoal(context.previousBlock.goal),
      frequencyDays: clampFrequency(context.previousBlockStats.daysPerWeek),
      level: context.profile.user.level,
      injuries: context.profile.morphology.injury_history.join(', '),
      sportsParallel: context.profile.parallel_sports.join(', '),
    };

    const result = await runDeterministicEngine({
      userId: 'fallback',
      answers,
      catalogue: catalogSnapshot,
    });
    return generationResultToIntermediate(result);
  }
}
