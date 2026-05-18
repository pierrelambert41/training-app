import type { AIContext } from '../../types/ai-context';
import type { ClaudeMessages } from '../../types/claude-messages';

// 12 séances ici (vs 6 pour session-summary, 8 pour block-summary) car l'analyse de plateau
// requiert un historique plus long pour distinguer un plateau réel (4-6 semaines) d'une variation
// passagère. docs/ai-strategy.md §4 cite "8-12 dernières séances" ; on prend le maximum de la
// fourchette car le coût de tokens reste acceptable sur un seul exercice (pas sur tout l'historique).
const MAX_PLATEAU_HISTORY_SESSIONS = 12;

const SYSTEM_INSTRUCTIONS = `Tu es un coach sportif expert en hypertrophie et en force.
Tu analyses les plateaux de progression et fournis des diagnostics structurés.
Réponds UNIQUEMENT en JSON valide, sans markdown, sans prose supplémentaire.
Sois direct et factuel. Utilise le français.`;

const OUTPUT_EXAMPLE = JSON.stringify({
  exercise: 'Squat',
  plateau_duration_weeks: 3,
  probable_causes: ['fatigue cumulée', 'impact du cardio jambes'],
  suggestions: [
    'Réduire le volume cardio cette semaine',
    'Essayer une variante (pause squat)',
    'Vérifier la profondeur d\'exécution',
  ],
});

/**
 * Construit les messages Claude API pour l'analyse d'un plateau sur un exercice.
 * Conforme à docs/ai-strategy.md §4.2.
 * Le bloc AIContextProfile est marqué cache_control pour le prompt caching (§5).
 */
export function buildPlateauAnalysisPrompt(
  ctx: AIContext,
  exerciseId: string
): ClaudeMessages {
  const exerciseHistory = (ctx.exerciseHistory ?? []).find(
    (h) => h.exerciseId === exerciseId
  );

  const plateauData = {
    exercise: exerciseHistory
      ? {
          exerciseId: exerciseHistory.exerciseId,
          exerciseName: exerciseHistory.exerciseName,
          sessions: exerciseHistory.sessions.slice(-MAX_PLATEAU_HISTORY_SESSIONS),
        }
      : { exerciseId, sessions: [] },
    readinessTrends: ctx.profile.readiness_trends ?? null,
    parallelSports: ctx.profile.parallel_sports,
    performanceBaseline: exerciseHistory
      ? ctx.profile.performance_baselines[exerciseHistory.exerciseName] ?? null
      : null,
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
            text: `Analyse ce plateau de progression et identifie les causes probables.

Données de l'exercice :
${JSON.stringify(plateauData)}

Réponds UNIQUEMENT avec un JSON valide respectant exactement cette structure :
${OUTPUT_EXAMPLE}`,
          },
        ],
      },
    ],
  };
}
