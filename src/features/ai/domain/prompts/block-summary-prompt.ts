import type { AIContext } from '../../types/ai-context';
import type { ClaudeMessages } from '../../types/claude-messages';

const MAX_BLOCK_HISTORY_SESSIONS = 8;

const SYSTEM_INSTRUCTIONS = `Tu es un coach sportif expert en hypertrophie et en force.
Tu analyses des blocs d'entraînement terminés et fournis des synthèses structurées.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans prose supplémentaire.
Sois direct et factuel. Utilise le français.`;

const OUTPUT_EXAMPLE = JSON.stringify({
  title: 'Bloc Hypertrophie 6 semaines',
  duration_weeks: 6,
  overall_assessment: 'Bon bloc avec progression régulière sur les mouvements principaux.',
  top_progressions: ['Bench +5kg e1RM', 'OHP +2.5kg e1RM'],
  stagnations: ['Squat plateau semaines 4-6'],
  compliance_note: 'Taux de complétion 87%, quelques séances manquées en semaine 5.',
  next_block_recommendation: 'Augmenter légèrement le volume squat, maintenir bench.',
});

/**
 * Construit les messages Claude API pour la synthèse d'un bloc terminé.
 * Cf. docs/ai-strategy.md §2 (generateBlockSummary).
 * Le bloc AIContextProfile est marqué cache_control pour le prompt caching (§5).
 */
export function buildBlockSummaryPrompt(ctx: AIContext): ClaudeMessages {
  const blockData = {
    currentBlock: ctx.profile.current_block ?? null,
    performanceBaselines: ctx.profile.performance_baselines,
    recentHighlights: ctx.profile.recent_highlights,
    readinessTrends: ctx.profile.readiness_trends ?? null,
    recentHistory: (ctx.exerciseHistory ?? []).map((h) => ({
      exerciseId: h.exerciseId,
      exerciseName: h.exerciseName,
      sessions: h.sessions.slice(-MAX_BLOCK_HISTORY_SESSIONS),
    })),
  };

  return {
    system: SYSTEM_INSTRUCTIONS,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Voici le profil de l\'athlète (contexte stable) :',
          },
          {
            type: 'text',
            text: JSON.stringify(ctx.profile),
            cache_control: { type: 'ephemeral' },
          },
          {
            type: 'text',
            text: `Génère une synthèse de ce bloc d'entraînement terminé.

Données du bloc :
${JSON.stringify(blockData)}

Réponds UNIQUEMENT avec un JSON valide respectant exactement cette structure :
${OUTPUT_EXAMPLE}`,
          },
        ],
      },
    ],
  };
}
