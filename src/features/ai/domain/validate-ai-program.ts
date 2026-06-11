import type { Exercise, TrainingLevel } from '@/types';
import type {
  AIIntermediateExercise,
  AIIntermediateOutput,
  ValidationContext,
  ValidationError,
  ValidationResult,
} from '../types/ai-generation';

/** Les 6 progressionType autorisés — source de vérité ADR-006. */
export const ALLOWED_PROGRESSIONS = [
  'strength_fixed',
  'double_progression',
  'accessory_linear',
  'bodyweight_progression',
  'duration_progression',
  'distance_duration',
] as const;

/**
 * Splits valides par fréquence — table docs/program-generation.md §5.1.
 * Le validateur accepte toute entrée valide pour la fréquence (le niveau
 * affine le choix côté prompt, mais une variante voisine reste un programme sain).
 */
const VALID_SPLITS_BY_FREQUENCY: Record<number, string[]> = {
  3: ['full_body_ab', 'full_body_abc'],
  4: ['upper_lower', 'upper_lower_upper_focus'],
  5: ['push_pull_legs', 'push_pull_legs_upper_lower'],
  6: ['push_pull_legs_x2'],
};

const MIN_WEEKS = 3;
const MAX_WEEKS = 12;
const MAX_SETS = 10;
const MAX_REPS = 30;
const MIN_RIR = 0;
const MAX_RIR = 4;

// Heuristique durée (alignée moteur Phase 3 : 8 min warm-up + 3-6 min/set selon rôle).
// Le schéma intermédiaire ne porte pas le rôle → moyenne 5 min/set.
const WARMUP_MIN = 8;
const MIN_PER_SET = 5;
const DURATION_TOLERANCE_MIN = 10;

function err(
  code: ValidationError['code'],
  field: string,
  message: string,
  blocking = true
): ValidationError {
  return { code, field, message, blocking };
}

function validateSchema(output: AIIntermediateOutput): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof output.split !== 'string' || output.split === '') {
    errors.push(err('schema_invalid', 'split', 'Champ "split" manquant ou vide.'));
  }
  if (
    typeof output.weeks !== 'number' ||
    !Number.isInteger(output.weeks) ||
    output.weeks < MIN_WEEKS ||
    output.weeks > MAX_WEEKS
  ) {
    errors.push(
      err(
        'schema_invalid',
        'weeks',
        `Champ "weeks" invalide (${String(output.weeks)}) — entier attendu entre ${MIN_WEEKS} et ${MAX_WEEKS}.`
      )
    );
  }
  if (!Array.isArray(output.days) || output.days.length === 0) {
    errors.push(err('schema_invalid', 'days', 'Champ "days" manquant ou vide.'));
    return errors;
  }

  output.days.forEach((day, dayIdx) => {
    if (typeof day.name !== 'string' || day.name === '') {
      errors.push(err('schema_invalid', `days[${dayIdx}].name`, 'Nom de séance manquant.'));
    }
    if (!Array.isArray(day.exercises) || day.exercises.length === 0) {
      errors.push(
        err('schema_invalid', `days[${dayIdx}].exercises`, 'Liste d\'exercices manquante ou vide.')
      );
      return;
    }
    day.exercises.forEach((ex, exIdx) => {
      errors.push(...validateExerciseSchema(ex, `days[${dayIdx}].exercises[${exIdx}]`));
    });
  });

  return errors;
}

function validateExerciseSchema(
  ex: AIIntermediateExercise,
  path: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (typeof ex.exercise_id !== 'string' || ex.exercise_id === '') {
    errors.push(err('schema_invalid', `${path}.exercise_id`, 'exercise_id manquant.'));
  }
  if (typeof ex.sets !== 'number' || !Number.isInteger(ex.sets) || ex.sets <= 0 || ex.sets > MAX_SETS) {
    errors.push(
      err('schema_invalid', `${path}.sets`, `sets invalide (${String(ex.sets)}) — entier attendu entre 1 et ${MAX_SETS}.`)
    );
  }
  if (typeof ex.reps !== 'string' || !/^\d{1,2}(-\d{1,2})?$/.test(ex.reps)) {
    errors.push(
      err('schema_invalid', `${path}.reps`, `reps invalide ("${String(ex.reps)}") — format attendu "8" ou "6-8".`)
    );
  } else {
    const bounds = ex.reps.split('-').map(Number);
    if (bounds.some((b) => b < 1 || b > MAX_REPS) || (bounds.length === 2 && bounds[0] >= bounds[1])) {
      errors.push(
        err('schema_invalid', `${path}.reps`, `reps hors limites ("${ex.reps}") — valeurs entre 1 et ${MAX_REPS}, borne basse < borne haute.`)
      );
    }
  }
  if (typeof ex.rir !== 'number' || ex.rir < MIN_RIR || ex.rir > MAX_RIR) {
    errors.push(
      err('schema_invalid', `${path}.rir`, `rir invalide (${String(ex.rir)}) — attendu entre ${MIN_RIR} et ${MAX_RIR}.`)
    );
  }
  if (ex.start_weight_kg !== null && (typeof ex.start_weight_kg !== 'number' || ex.start_weight_kg < 0)) {
    errors.push(
      err('schema_invalid', `${path}.start_weight_kg`, `start_weight_kg invalide (${String(ex.start_weight_kg)}) — nombre ≥ 0 ou null attendu.`)
    );
  }
  if (typeof ex.progression !== 'string' || ex.progression === '') {
    errors.push(err('schema_invalid', `${path}.progression`, 'progression manquante.'));
  }

  return errors;
}

function validateCatalogueAndConstraints(
  output: AIIntermediateOutput,
  ctx: ValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];
  const byId = new Map(ctx.catalogue.map((e) => [e.id, e]));
  const equipmentAllowed = new Set(ctx.userConstraints.equipmentAllowed);
  const forbiddenMuscles = new Set(ctx.userConstraints.forbiddenMuscles);
  const forbiddenTags = new Set(ctx.userConstraints.forbiddenMorphoTags);

  output.days.forEach((day, dayIdx) => {
    (day.exercises ?? []).forEach((ex, exIdx) => {
      const path = `days[${dayIdx}].exercises[${exIdx}]`;

      if (typeof ex.progression === 'string' && !ALLOWED_PROGRESSIONS.includes(ex.progression as (typeof ALLOWED_PROGRESSIONS)[number])) {
        errors.push(
          err(
            'invalid_progression',
            `${path}.progression`,
            `progression "${ex.progression}" non reconnue — utiliser uniquement : ${ALLOWED_PROGRESSIONS.join(', ')}.`
          )
        );
      }

      const exercise = byId.get(ex.exercise_id);
      if (!exercise) {
        errors.push(
          err(
            'unknown_exercise',
            `${path}.exercise_id`,
            `exercise_id "${ex.exercise_id}" introuvable dans le catalogue — utiliser uniquement les IDs de la liste fournie.`
          )
        );
        return;
      }

      const missingEquipment = exercise.equipment.filter((eq) => !equipmentAllowed.has(eq));
      if (missingEquipment.length > 0) {
        errors.push(
          err(
            'equipment_unavailable',
            `${path}.exercise_id`,
            `"${ex.exercise_id}" requiert un matériel indisponible (${missingEquipment.join(', ')}) — choisir un exercice compatible avec le matériel de l'utilisateur.`
          )
        );
      }

      if (exercise.primaryMuscles.some((m) => forbiddenMuscles.has(m))) {
        errors.push(
          err(
            'forbidden_exercise',
            `${path}.exercise_id`,
            `"${ex.exercise_id}" sollicite un muscle blessé/interdit — exclure ce mouvement.`
          )
        );
      }
      if (exercise.morphoTags.some((t) => forbiddenTags.has(t))) {
        errors.push(
          err(
            'forbidden_exercise',
            `${path}.exercise_id`,
            `"${ex.exercise_id}" porte un tag incompatible avec les contraintes de l'utilisateur — exclure ce mouvement.`
          )
        );
      }
    });
  });

  return errors;
}

function validateStructure(
  output: AIIntermediateOutput,
  ctx: ValidationContext
): ValidationError[] {
  const errors: ValidationError[] = [];

  const validSplits = VALID_SPLITS_BY_FREQUENCY[ctx.frequencyDays] ?? [];
  if (typeof output.split === 'string' && output.split !== '' && !validSplits.includes(output.split)) {
    errors.push(
      err(
        'invalid_split',
        'split',
        `split "${output.split}" invalide pour ${ctx.frequencyDays} jours/semaine — splits autorisés : ${validSplits.join(', ')}.`
      )
    );
  }

  if (Array.isArray(output.days) && output.days.length !== ctx.frequencyDays) {
    errors.push(
      err(
        'day_count_mismatch',
        'days',
        `${output.days.length} séances générées pour une fréquence de ${ctx.frequencyDays} jours/semaine — générer exactement ${ctx.frequencyDays} séances.`
      )
    );
  }

  const maxDuration = ctx.userConstraints.maxSessionDurationMin;
  if (maxDuration !== null && Array.isArray(output.days)) {
    output.days.forEach((day, dayIdx) => {
      const totalSets = (day.exercises ?? []).reduce(
        (sum, ex) => sum + (typeof ex.sets === 'number' ? ex.sets : 0),
        0
      );
      const estimatedMin = WARMUP_MIN + totalSets * MIN_PER_SET;
      if (estimatedMin > maxDuration + DURATION_TOLERANCE_MIN) {
        errors.push(
          err(
            'session_too_long',
            `days[${dayIdx}]`,
            `Séance "${day.name}" estimée à ~${estimatedMin} min pour une limite de ${maxDuration} min — réduire le nombre d'exercices ou de séries.`
          )
        );
      }
    });
  }

  return errors;
}

function buildFeedback(errors: ValidationError[]): string {
  const blocking = errors.filter((e) => e.blocking);
  const lines = blocking.map((e) => `- [${e.field}] ${e.message}`);
  return `Le programme généré a été rejeté par le validateur. Corrige les points suivants et renvoie UNIQUEMENT le JSON corrigé :\n${lines.join('\n')}`;
}

/**
 * Validateur déterministe post-IA (ADR-028, TA-143) — arbitre final entre
 * l'espace de solutions valides et la sortie du modèle.
 *
 * Opère sur le schéma JSON intermédiaire (jamais le type Program complet).
 * Pure : catalogue et contraintes passés en paramètre, aucun I/O.
 *
 * En cas d'échec, `feedback` contient un texte actionnable à injecter dans
 * le prompt du retry (cycle : 1 retry → AIValidationExhaustedError → FallbackProvider).
 */
export function validateAIGeneratedProgram(
  output: AIIntermediateOutput,
  ctx: ValidationContext
): ValidationResult {
  const errors: ValidationError[] = [
    ...validateSchema(output),
    ...validateStructure(output, ctx),
    ...validateCatalogueAndConstraints(output, ctx),
  ];

  const valid = errors.every((e) => !e.blocking);
  return {
    valid,
    errors,
    feedback: valid ? undefined : buildFeedback(errors),
  };
}

/** Splits §5.1 exposés pour les prompts (TA-147) — même source que le validateur. */
export function validSplitsForFrequency(frequencyDays: number, _level?: TrainingLevel): string[] {
  return VALID_SPLITS_BY_FREQUENCY[frequencyDays] ?? [];
}
