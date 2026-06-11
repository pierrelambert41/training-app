import type { Exercise } from '@/types';
import type { BlockRegenerationContext } from '../../types/ai-generation';
import type { ClaudeMessages } from '../../types/claude-messages';
import { buildCatalogueBlock, buildProgramRulesBlock } from './program-rules-block';

const SYSTEM_ROLE = `Tu es un coach expert en hypertrophie et en force, spécialiste de la programmation evidence-based.
Tu construis le bloc d'entraînement SUIVANT d'un athlète à partir de son bloc précédent et de ses résultats réels.
Tu réponds UNIQUEMENT en JSON valide conforme au schéma intermédiaire imposé.`;

const REASON_LABELS: Record<BlockRegenerationContext['reason'], string> = {
  end_of_block: 'fin de bloc planifiée — transition normale vers le bloc suivant',
  goal_change: "changement d'objectif de l'athlète — adapter la structure en conséquence",
  compliance_gap: 'écart important entre prévu et réalisé — simplifier et consolider',
};

/**
 * Prompt de régénération de bloc (ADR-028, TA-144/147).
 *
 * Même mécanique de prompt caching que generateProgram : catalogue en
 * première position du système avec cache_control: ephemeral.
 *
 * Continuité analytique inter-blocs (docs/program-generation.md §9) :
 * instruction explicite de conserver 60-80% des exercices — c'est une
 * consigne de prompt, pas une règle du validateur (l'IA peut déroger si fondé).
 */
export function buildRegenerateBlockPrompt(
  context: BlockRegenerationContext,
  catalogSnapshot: Exercise[]
): ClaudeMessages {
  const stats = context.previousBlockStats;

  const rules = buildProgramRulesBlock({
    frequencyDays: stats.daysPerWeek,
    maxSessionDurationMin: null,
    injuries: context.profile.morphology.injury_history.join(', '),
    sportsParallel: context.profile.parallel_sports.join(', '),
  });

  const continuity = `CONTINUITÉ INTER-BLOCS (règle produit) :
- Conserve 60 à 80% des exercices du bloc précédent — la continuité analytique permet de suivre la progression.
- Ne remplace un exercice que pour une raison fondée : fatigue chronique, plateau persistant, changement d'objectif.
- Justifie chaque remplacement dans le champ "reasoning".`;

  const previousBlockData = {
    title: context.previousBlock.title,
    goal: context.previousBlock.goal,
    duration_weeks: context.previousBlock.durationWeeks,
    compliance_rate: stats.complianceRate,
    avg_fatigue_score: stats.avgFatigueScore,
    prs: stats.prs,
    exercises: stats.exerciseProgress.map((e) => ({
      exercise_id: e.exerciseId,
      name: e.exerciseName,
      e1rm_trend: e.e1rmTrend,
      compliance_rate: e.complianceRate,
    })),
  };

  return {
    system: [
      {
        type: 'text',
        text: buildCatalogueBlock(catalogSnapshot),
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: `${SYSTEM_ROLE}

${rules}

${continuity}`,
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Profil de l'athlète (contexte stable) :
${JSON.stringify(context.profile)}

Bloc précédent et résultats réels :
${JSON.stringify(previousBlockData)}

Raison de la régénération : ${REASON_LABELS[context.reason]}.

Génère le bloc suivant (${stats.daysPerWeek} séances/semaine). Réponds UNIQUEMENT avec le JSON du schéma intermédiaire.`,
          },
        ],
      },
    ],
  };
}
