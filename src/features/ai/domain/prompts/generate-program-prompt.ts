import type { Exercise } from '@/types';
import type { ProgramGenerationContext } from '../../types/ai-generation';
import type { ClaudeMessages } from '../../types/claude-messages';
import { buildCatalogueBlock, buildProgramRulesBlock } from './program-rules-block';

const SYSTEM_ROLE = `Tu es un coach expert en hypertrophie et en force, spécialiste de la programmation evidence-based.
Tu construis des programmes d'entraînement personnalisés à partir d'un questionnaire utilisateur et d'un profil athlète.
Tu réponds UNIQUEMENT en JSON valide conforme au schéma intermédiaire imposé.`;

const DEFAULT_FREQUENCY = 3;

/**
 * Prompt de génération initiale de programme (ADR-028, TA-142/147).
 *
 * Structure système (ordre imposé pour le prompt caching ADR-025) :
 * 1. Catalogue filtré — première position, cache_control: ephemeral (~90% de
 *    réduction de coût sur les générations suivantes, le bloc est stable par profil).
 * 2. Rôle + cadre dur des règles + principes evidence-based + schéma de sortie.
 *
 * Fonction pure : le catalogue est passé pré-filtré (matériel/contraintes)
 * par le service appelant — aucun read SQLite ici.
 */
export function buildGenerateProgramPrompt(
  context: ProgramGenerationContext,
  catalogSnapshot: Exercise[]
): ClaudeMessages {
  const q = context.questionnaire;
  const frequencyDays = q.frequencyDays ?? DEFAULT_FREQUENCY;

  const rules = buildProgramRulesBlock({
    frequencyDays,
    maxSessionDurationMin: q.maxSessionDurationMin,
    injuries: q.injuries,
    sportsParallel: q.sportsParallel,
    level: q.level,
    volumeTolerance: q.volumeTolerance,
    priorityMuscles: q.priorityMuscles,
  });

  const questionnaireSummary = {
    goal: q.goal,
    frequency_days: frequencyDays,
    level: q.level,
    equipment: q.equipment,
    priority_muscles: q.priorityMuscles,
    avoid_exercises: q.avoidExercises,
    max_session_duration_min: q.maxSessionDurationMin,
    mixed_priority: q.mixedPriority,
    volume_tolerance: q.volumeTolerance,
    weight_kg: q.weightKg,
    height_cm: q.heightCm,
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

${rules}`,
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

Questionnaire :
${JSON.stringify(questionnaireSummary)}

Génère le programme complet (${frequencyDays} séances/semaine). Réponds UNIQUEMENT avec le JSON du schéma intermédiaire.`,
          },
        ],
      },
    ],
  };
}
