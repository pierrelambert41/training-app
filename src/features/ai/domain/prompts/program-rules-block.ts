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
  level: 'beginner' | 'intermediate' | 'advanced' | null;
  volumeTolerance: 'low' | 'medium' | 'high' | null;
  priorityMuscles: string[];
};

/**
 * Fourchettes de séries dures par groupe musculaire et par semaine
 * (volume landmarks evidence-based, cf. docs/ai-strategy.md §1).
 * La tolérance au volume déplace la cible dans la fourchette.
 */
function weeklySetsTarget(
  level: ProgramRulesInput['level'],
  tolerance: ProgramRulesInput['volumeTolerance']
): { min: number; max: number } {
  const base =
    level === 'beginner' ? { min: 8, max: 12 } :
    level === 'advanced' ? { min: 14, max: 20 } :
    { min: 10, max: 16 };
  if (tolerance === 'low') return { min: base.min, max: base.min + 2 };
  if (tolerance === 'high') return { min: base.max - 2, max: base.max };
  return base;
}

/**
 * Cadre dur des règles injecté dans le prompt système (ADR-006, ADR-028,
 * docs/program-generation.md §5.1) + invitation evidence-based + schéma
 * JSON intermédiaire de sortie.
 */
export function buildProgramRulesBlock(input: ProgramRulesInput): string {
  const splits = validSplitsForFrequency(input.frequencyDays);

  const target = weeklySetsTarget(input.level, input.volumeTolerance);
  const priority = input.priorityMuscles.filter((m) => m.trim() !== '');

  return `CADRE DUR (toute violation sera rejetée par un validateur déterministe) :
1. split : une seule valeur autorisée pour ${input.frequencyDays} jours/semaine parmi : ${splits.join(', ')}.
2. Génère exactement ${input.frequencyDays} séances (days).
3. progression : uniquement parmi ${ALLOWED_PROGRESSIONS.join(', ')}.
4. exercise_id : uniquement les ids du catalogue fourni — aucun exercice inventé.

DIMENSIONNEMENT — LE VOLUME EST LA RÈGLE PRINCIPALE (MV/MEV/MAV/MRV) :
5. Cible ${target.min} à ${target.max} séries dures par groupe musculaire et par semaine, réparties sur les ${input.frequencyDays} séances. C'est ce volume qui détermine le nombre d'exercices et de séries — jamais l'inverse.
${priority.length > 0 ? `6. Muscles prioritaires (haut de fourchette, ~MAV) : ${priority.join(', ')}. Les autres muscles entraînés restent ≥ MEV (~8-10 séries/semaine).` : '6. Pas de muscle prioritaire : répartis le volume équitablement, chaque muscle entraîné ≥ MEV (~8-10 séries/semaine).'}
${input.maxSessionDurationMin !== null ? `7. Durée max de séance (plafond secondaire) : ${input.maxSessionDurationMin} min (~8 min d'échauffement + ~3 min par série, repos inclus). En cas de conflit avec le volume cible : réduis d'abord les isolations des muscles non prioritaires — jamais un muscle entraîné sous son MEV.` : '7. Pas de contrainte de durée de séance.'}
8. Densité : 5 à 7 exercices par séance (jamais moins de 4) — 1-2 polyarticulaires lourds puis secondaires et isolations.
${input.injuries.trim() !== '' ? `9. Blessures/contraintes à respecter absolument : ${input.injuries.trim()}.` : '9. Aucune blessure déclarée.'}
${input.sportsParallel.trim() !== '' ? `10. Sports pratiqués en parallèle (gérer la fatigue systémique en conséquence) : ${input.sportsParallel.trim()}.` : '10. Pas de sport en parallèle.'}

PRINCIPES EVIDENCE-BASED (raisonne explicitement sur ces axes) :
- Volume par muscle dans les landmarks MV/MEV/MAV/MRV selon le niveau de l'athlète.
- Stimulus-to-fatigue ratio : privilégier les mouvements à haut stimulus et fatigue maîtrisée pour le volume d'accessoires.
- Placement des séances intenses : espacer les séances à forte fatigue systémique, pas deux jours lourds consécutifs sur les mêmes structures.
- Progression adaptée au type de mouvement (composés lourds → strength_fixed/double_progression, isolation → accessory_linear).

FORMAT DE SORTIE — JSON UNIQUEMENT, aucun texte hors JSON, exactement ce schéma intermédiaire épuré (jamais d'UUID, jamais de structure interne) :
${OUTPUT_SCHEMA_EXAMPLE}

Le champ "reasoning" : 15-30 mots max par décision principale.`;
}
