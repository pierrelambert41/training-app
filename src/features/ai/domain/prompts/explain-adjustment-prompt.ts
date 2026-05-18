import type { AIContext } from '../../types/ai-context';
import type { Recommendation } from '../../types/ai-responses';
import type { ClaudeMessages } from '../../types/claude-messages';

const SYSTEM_INSTRUCTIONS = `Tu es un coach sportif expert en hypertrophie et en force.
Tu expliques les recommandations d'ajustement de charges de manière claire et motivante.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans prose supplémentaire.
Sois direct et bref (2-3 phrases max pour l'explication). Utilise le français.`;

const OUTPUT_EXAMPLE = JSON.stringify({
  message: 'Augmentation de charge recommandée : tu as atteint tes reps cibles sur les 2 dernières séances.',
  action: 'increase',
  confidence: 0.85,
  rationale: 'Progression linéaire cohérente avec ton niveau et ton objectif hypertrophie.',
});

/**
 * Construit les messages Claude API pour l'explication d'un ajustement de charge.
 * Cf. docs/ai-strategy.md §2 (explainAdjustment).
 * Le bloc AIContextProfile est marqué cache_control pour le prompt caching (§5).
 */
export function buildExplainAdjustmentPrompt(
  ctx: AIContext,
  recommendation: Recommendation
): ClaudeMessages {
  const adjustmentData = {
    recommendation,
    rulesEngineRecommendations: ctx.rulesEngineRecommendations,
    currentBlock: ctx.profile.current_block ?? null,
    recentHighlights: ctx.profile.recent_highlights,
    readinessTrends: ctx.profile.readiness_trends ?? null,
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
            text: `Explique cet ajustement de charge à l'athlète en 2-3 phrases maximum.

Données de l'ajustement :
${JSON.stringify(adjustmentData)}

Réponds UNIQUEMENT avec un JSON valide respectant exactement cette structure :
${OUTPUT_EXAMPLE}`,
          },
        ],
      },
    ],
  };
}
