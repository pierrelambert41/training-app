import type { Exercise } from '@/types';
import { ALLOWED_PROGRESSIONS, validSplitsForFrequency } from '../validate-ai-program';

/**
 * Blocs d'instructions partagés entre buildGenerateProgramPrompt et
 * buildRegenerateBlockPrompt (TA-147). Fonctions pures, catalogue passé
 * en paramètre (pré-filtré par le service appelant).
 */

export const OUTPUT_SCHEMA_EXAMPLE = JSON.stringify(
  {
    split: 'upper_lower',
    weeks: 6,
    reasoning: 'Choix principaux justifiés en 15-30 mots chacun.',
    days: [
      {
        name: 'Upper A',
        exercises: [
          {
            exercise_id: 'bench_press',
            sets: 4,
            reps: '6-8',
            rir: 2,
            start_weight_kg: 80,
            progression: 'double_progression',
          },
        ],
      },
    ],
  },
  null,
  2
);

/**
 * Sérialisation compacte du catalogue pour le prompt système (1 ligne JSON
 * par exercice). Bloc stable entre appels pour un même profil → placé en
 * première position avec cache_control: ephemeral (réduction coût ~90%).
 */
export function buildCatalogueBlock(catalogSnapshot: Exercise[]): string {
  const lines = catalogSnapshot.map((ex) =>
    JSON.stringify({
      id: ex.id,
      name: ex.nameFr ?? ex.name,
      pattern: ex.movementPattern,
      muscles: ex.primaryMuscles,
      equipment: ex.equipment,
      fatigue: ex.systemicFatigue,
      progression_recommandee: ex.recommendedProgressionType,
    })
  );
  return `CATALOGUE D'EXERCICES (référence fermée — utiliser UNIQUEMENT ces ids) :
${lines.join('\n')}`;
}

export type ProgramRulesInput = {
  frequencyDays: number;
  maxSessionDurationMin: number | null;
  injuries: string;
  sportsParallel: string;
};

/**
 * Cadre dur des règles injecté dans le prompt système (ADR-006, ADR-028,
 * docs/program-generation.md §5.1) + invitation evidence-based + schéma
 * JSON intermédiaire de sortie.
 */
export function buildProgramRulesBlock(input: ProgramRulesInput): string {
  const splits = validSplitsForFrequency(input.frequencyDays);

  return `CADRE DUR (toute violation sera rejetée par un validateur déterministe) :
1. split : une seule valeur autorisée pour ${input.frequencyDays} jours/semaine parmi : ${splits.join(', ')}.
2. Génère exactement ${input.frequencyDays} séances (days).
3. progression : uniquement parmi ${ALLOWED_PROGRESSIONS.join(', ')}.
4. exercise_id : uniquement les ids du catalogue fourni — aucun exercice inventé.
${input.maxSessionDurationMin !== null ? `5. Durée max de séance : ${input.maxSessionDurationMin} min (~8 min d'échauffement + ~5 min par série) — dimensionne le nombre d'exercices et de séries en conséquence.` : '5. Pas de contrainte de durée de séance.'}
${input.injuries.trim() !== '' ? `6. Blessures/contraintes à respecter absolument : ${input.injuries.trim()}.` : '6. Aucune blessure déclarée.'}
${input.sportsParallel.trim() !== '' ? `7. Sports pratiqués en parallèle (gérer la fatigue systémique en conséquence) : ${input.sportsParallel.trim()}.` : '7. Pas de sport en parallèle.'}

PRINCIPES EVIDENCE-BASED (raisonne explicitement sur ces axes) :
- Volume par muscle dans les landmarks MV/MEV/MAV/MRV selon le niveau de l'athlète.
- Stimulus-to-fatigue ratio : privilégier les mouvements à haut stimulus et fatigue maîtrisée pour le volume d'accessoires.
- Placement des séances intenses : espacer les séances à forte fatigue systémique, pas deux jours lourds consécutifs sur les mêmes structures.
- Progression adaptée au type de mouvement (composés lourds → strength_fixed/double_progression, isolation → accessory_linear).

FORMAT DE SORTIE — JSON UNIQUEMENT, aucun texte hors JSON, exactement ce schéma intermédiaire épuré (jamais d'UUID, jamais de structure interne) :
${OUTPUT_SCHEMA_EXAMPLE}

Le champ "reasoning" : 15-30 mots max par décision principale.`;
}
