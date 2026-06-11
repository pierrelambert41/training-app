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
 * Repères de volume hebdomadaire — UNIQUEMENT des affirmations sourcées dans
 * la littérature (méta-analyses / revues systématiques). Aucune coupure par
 * niveau inventée : la littérature ne fournit pas de tranches précises par
 * ancienneté d'entraînement, donc on donne au modèle la zone documentée et le
 * profil, et on exige une justification (champ reasoning).
 * Sources citées dans le prompt : Schoenfeld, Ogborn & Krieger 2017 (J Sports
 * Sci, dose-réponse ≥ 10 séries/muscle/semaine) ; Baz-Valle et al. 2022
 * (revue systématique, zone 12-20 chez le pratiquant entraîné, retours
 * décroissants au-delà de ~20).
 */
const EVIDENCE_VOLUME_FLOOR = 10;
const EVIDENCE_VOLUME_CEILING = 20;

/**
 * Cadre dur des règles injecté dans le prompt système (ADR-006, ADR-028,
 * docs/program-generation.md §5.1) + invitation evidence-based + schéma
 * JSON intermédiaire de sortie.
 */
export function buildProgramRulesBlock(input: ProgramRulesInput): string {
  const splits = validSplitsForFrequency(input.frequencyDays);

  const priority = input.priorityMuscles.filter((m) => m.trim() !== '');

  return `CADRE DUR (toute violation sera rejetée par un validateur déterministe) :
1. split : une seule valeur autorisée pour ${input.frequencyDays} jours/semaine parmi : ${splits.join(', ')}.
2. Génère exactement ${input.frequencyDays} séances (days).
3. progression : uniquement parmi ${ALLOWED_PROGRESSIONS.join(', ')}.
4. exercise_id : uniquement les ids du catalogue fourni — aucun exercice inventé.

DIMENSIONNEMENT — LE VOLUME PAR MUSCLE EST LA RÈGLE PRINCIPALE (base scientifique imposée) :
5. Pour l'hypertrophie, cible au minimum ${EVIDENCE_VOLUME_FLOOR} séries dures par groupe musculaire et par semaine (relation dose-réponse : Schoenfeld, Ogborn & Krieger 2017, méta-analyse, J Sports Sci). La zone documentée chez le pratiquant entraîné est ${EVIDENCE_VOLUME_FLOOR + 2}-${EVIDENCE_VOLUME_CEILING} séries/semaine, avec des retours décroissants et un risque de dépasser la capacité de récupération au-delà de ~${EVIDENCE_VOLUME_CEILING} (Baz-Valle et al. 2022, revue systématique). C'est ce volume, réparti sur les ${input.frequencyDays} séances, qui détermine le nombre d'exercices et de séries — jamais l'inverse.
6. Comptage du volume par muscle — applique-le comme dans les études de ces revues : les séries de polyarticulaires comptent pour leurs muscles moteurs (dans Baz-Valle et al. 2022, le volume du triceps brachial inclut les séries de développés, celui du biceps les tirages ; Gentil et al. 2015 montre une croissance des synergistes avec les polyarticulaires seuls). Il n'existe pas de standard publié pour pondérer les synergistes — n'exige jamais le plancher en séries d'isolation pures.
7. Positionne chaque muscle DANS cette zone documentée selon le profil (ancienneté d'entraînement${input.level ? ` : ${input.level}` : ''}, tolérance au volume déclarée${input.volumeTolerance ? ` : ${input.volumeTolerance}` : ''}, sports parallèles, récupération) et justifie ce positionnement dans "reasoning". ${priority.length > 0 ? `Muscles prioritaires (haut de zone) : ${priority.join(', ')}. Les autres muscles entraînés restent ≥ ${EVIDENCE_VOLUME_FLOOR} séries/semaine.` : `Pas de muscle prioritaire : chaque muscle entraîné ≥ ${EVIDENCE_VOLUME_FLOOR} séries/semaine.`} Pour un objectif force, la charge et la spécificité priment : un volume plus bas par muscle est acceptable si justifié.
${input.maxSessionDurationMin !== null ? `8. Durée max de séance (plafond IMPÉRATIF, vérifié par le validateur) : ${input.maxSessionDurationMin} min. Budget : maximum ${Math.floor((input.maxSessionDurationMin - 8) / 3)} séries par séance (~8 min d'échauffement + ~3 min par série, repos inclus) — compte tes séries avant de répondre. Si le budget ne permet pas le plancher pour tous les muscles : restreins le nombre de groupes ciblés directement (priorités d'abord, le reste couvert indirectement par les polyarticulaires) plutôt que de dépasser la durée.` : '8. Pas de contrainte de durée de séance.'}
9. Densité : 5 à 7 exercices par séance (jamais moins de 4) — 1-2 polyarticulaires lourds puis secondaires et isolations.
${input.injuries.trim() !== '' ? `10. Blessures/contraintes à respecter absolument : ${input.injuries.trim()}.` : '10. Aucune blessure déclarée.'}
${input.sportsParallel.trim() !== '' ? `11. Sports pratiqués en parallèle (gérer la fatigue systémique en conséquence) : ${input.sportsParallel.trim()}.` : '11. Pas de sport en parallèle.'}

PRINCIPES EVIDENCE-BASED (raisonne explicitement sur ces axes) :
- Volume par muscle dans les landmarks MV/MEV/MAV/MRV selon le niveau de l'athlète.
- Stimulus-to-fatigue ratio : privilégier les mouvements à haut stimulus et fatigue maîtrisée pour le volume d'accessoires.
- Placement des séances intenses : espacer les séances à forte fatigue systémique, pas deux jours lourds consécutifs sur les mêmes structures.
- Progression adaptée au type de mouvement (composés lourds → strength_fixed/double_progression, isolation → accessory_linear).

FORMAT DE SORTIE — JSON UNIQUEMENT, aucun texte hors JSON, exactement ce schéma intermédiaire épuré (jamais d'UUID, jamais de structure interne) :
${OUTPUT_SCHEMA_EXAMPLE}

Le champ "reasoning" : 15-30 mots max par décision principale.`;
}
