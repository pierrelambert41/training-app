import type { AIContext } from '../../types/ai-context';
import type { ClaudeMessages } from '../../types/claude-messages';

const MAX_HISTORY_SESSIONS = 6;

const SYSTEM_INSTRUCTIONS = `Tu es un coach sportif expert en hypertrophie et en force.
Tu analyses les données de séances d'entraînement et fournis des résumés concis et structurés.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans prose supplémentaire.
Sois direct et factuel. Utilise le français.`;

const OUTPUT_EXAMPLE = JSON.stringify({
  overall_rating: 'good',
  summary: 'Bonne séance push. Progression sur le bench, technique stable.',
  highlights: ['Bench 95kg x 5 — PR série'],
  concerns: ['Fatigue triceps sur les 2 dernières séries'],
  fatigue_note: 'Fatigue modérée, récupération correcte',
  next_session_note: 'Maintenir la charge bench, surveiller triceps',
});

/**
 * Construit les messages Claude API pour le résumé fin de séance.
 * Conforme à docs/ai-strategy.md §4.1.
 * Le bloc AIContextProfile est marqué cache_control pour le prompt caching (§5).
 */
export function buildSessionSummaryPrompt(ctx: AIContext): ClaudeMessages {
  const sessionData = {
    session: ctx.currentSession ?? null,
    previousSession: ctx.previousSession ?? null,
    rulesEngineRecommendations: ctx.rulesEngineRecommendations,
    recentHistory: (ctx.exerciseHistory ?? []).map((h) => ({
      exerciseId: h.exerciseId,
      exerciseName: h.exerciseName,
      sessions: h.sessions.slice(-MAX_HISTORY_SESSIONS),
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
            text: `Analyse cette séance et génère un résumé structuré.

Données de la séance :
${JSON.stringify(sessionData)}

Réponds UNIQUEMENT avec un JSON valide respectant exactement cette structure :
${OUTPUT_EXAMPLE}`,
          },
        ],
      },
    ],
  };
}
