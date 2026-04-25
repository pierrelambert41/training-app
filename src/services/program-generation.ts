
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
import type {
  BlockGoal,
  Exercise,
  GenerationDayDraft,
  GenerationHistoryEntry,
  GenerationInput,
  GenerationResult,
  GenerationSplitKind,
  GenerationWarning,
  MovementPattern,
  NewBlockInput,
  NewPlannedExerciseInput,
  NewProgramInput,
  NewWorkoutDayInput,
  PlannedExerciseRole,
  SplitType,
  TrainingLevel,
  VolumeToleranceLevel,
} from '@/types';
import { assignProgressionConfig } from './progression-config';

const BLOCK_DURATION_WEEKS = 6;
const HISTORY_RECENCY_WEEKS = 8;

// Mapping français → token muscle catalogue. Utilisé pour la priorité muscle
// (les labels UI sont en français, le catalogue en anglais).
const MUSCLE_LABEL_TO_TOKENS: Record<string, string[]> = {
  Pectoraux: ['chest', 'upper_chest', 'lower_chest'],
  Dos: ['lats', 'rhomboids', 'upper_back', 'lower_back'],
  'Épaules': ['front_deltoid', 'lateral_deltoid', 'rear_deltoid'],
  Biceps: ['biceps', 'brachialis', 'brachioradialis'],
  Triceps: ['triceps'],
  Quadriceps: ['quads'],
  'Ischio-jambiers': ['hamstrings'],
  Fessiers: ['glutes', 'glute_medius'],
  Mollets: ['gastrocnemius', 'soleus'],
  Abdominaux: ['rectus_abdominis', 'core', 'obliques'],
};

// Keywords (normalisés, lowercase) qui trahissent un sport parallèle
// à forte sollicitation des jambes → réduction volume lower body.
const LEG_IMPACT_SPORT_KEYWORDS = [
  'course',
  'running',
  'trail',
  'marathon',
  'cyclisme',
  'velo',
  'vélo',
  'bike',
  'football',
  'foot',
  'rugby',
  'basket',
  'tennis',
  'ski',
];

type Goal = 'hypertrophy' | 'strength' | 'mixed';

type DayPatternSlot = {
  pattern: MovementPattern;
  role: PlannedExerciseRole;
  muscleBias?: string[];
};

type DayTemplate = {
  title: string;
  splitType: SplitType;
  patterns: DayPatternSlot[];
};

type SplitTemplate = {
  kind: GenerationSplitKind;
  days: DayTemplate[];
};

// ---------------------------------------------------------------------------
// Couche 1 — Choix du split (docs §5.1)
// ---------------------------------------------------------------------------

export function pickSplit(
  frequency: 3 | 4 | 5 | 6,
  level: TrainingLevel
): { kind: GenerationSplitKind; warning: GenerationWarning | null } {
  // La table 5.1 est incomplète pour (5 jours, beginner) et (6 jours, beginner).
  // Fallback → intermediate.
  let effectiveLevel: TrainingLevel = level;
  let warning: GenerationWarning | null = null;
  if (
    level === 'beginner' &&
    (frequency === 5 || frequency === 6)
  ) {
    effectiveLevel = 'intermediate';
    warning = {
      code: 'fallback_level',
      message: `Fréquence ${frequency} j non recommandée pour débutant — split intermédiaire utilisé`,
      context: { frequency, requested: level, used: effectiveLevel },
    };
  }

  const kind = resolveSplitKind(frequency, effectiveLevel);
  return { kind, warning };
}

function resolveSplitKind(
  frequency: 3 | 4 | 5 | 6,
  level: TrainingLevel
): GenerationSplitKind {
  if (frequency === 3) {
    return level === 'beginner' ? 'full_body_ab' : 'full_body_abc';
  }
  if (frequency === 4) {
    return level === 'advanced' ? 'upper_lower_upper_focus' : 'upper_lower';
  }
  if (frequency === 5) {
    return 'push_pull_legs_upper_lower';
  }
  // 6 jours
  return 'push_pull_legs_x2';
}

// ---------------------------------------------------------------------------
// Templates de séance par split (Couche 2 — structure de la semaine)
// ---------------------------------------------------------------------------

function buildSplitTemplate(
  kind: GenerationSplitKind,
  goal: Goal
): SplitTemplate {
  switch (kind) {
    case 'full_body_ab':
      return {
        kind,
        days: [
          fullBodyDay('Full Body A', 'squat', 'horizontal_push', 'horizontal_pull'),
          fullBodyDay('Full Body B', 'hinge', 'vertical_pull', 'vertical_push'),
        ],
      };
    case 'full_body_abc':
      return {
        kind,
        days: [
          fullBodyDay('Full Body A', 'squat', 'horizontal_push', 'horizontal_pull'),
          fullBodyDay('Full Body B', 'hinge', 'vertical_push', 'vertical_pull'),
          fullBodyDay('Full Body C', 'unilateral_quad', 'horizontal_pull', 'horizontal_push'),
        ],
      };
    case 'upper_lower':
      return {
        kind,
        days: [
          upperDay('Upper 1', 'horizontal_push'),
          lowerDay('Lower 1', 'squat'),
          upperDay('Upper 2', 'vertical_pull'),
          lowerDay('Lower 2', 'hinge'),
        ],
      };
    case 'upper_lower_upper_focus':
      // Avancé 4 jours : priorité haut du corps, deux expositions bench
      return {
        kind,
        days: [
          upperDay('Upper Force', 'horizontal_push'),
          lowerDay('Lower Force', 'squat'),
          upperDay('Upper Volume', 'vertical_pull'),
          lowerDay('Lower Volume', 'hinge'),
        ],
      };
    case 'push_pull_legs':
      return {
        kind,
        days: [
          pushDay('Push'),
          pullDay('Pull'),
          legsDay('Legs', 'squat'),
        ],
      };
    case 'push_pull_legs_upper_lower':
      // 5 jours : PPL + Upper + Lower pour repousser fatigue
      return {
        kind,
        days: [
          pushDay('Push'),
          pullDay('Pull'),
          legsDay('Legs', 'squat'),
          upperDay('Upper', goal === 'strength' ? 'horizontal_push' : 'vertical_pull'),
          lowerDay('Lower', 'hinge'),
        ],
      };
    case 'push_pull_legs_x2':
      return {
        kind,
        days: [
          pushDay('Push A'),
          pullDay('Pull A'),
          legsDay('Legs A', 'squat'),
          pushDay('Push B'),
          pullDay('Pull B'),
          legsDay('Legs B', 'hinge'),
        ],
      };
  }
}

function fullBodyDay(
  title: string,
  mainLower: MovementPattern,
  mainUpper: MovementPattern,
  secondaryUpper: MovementPattern
): DayTemplate {
  return {
    title,
    splitType: 'full',
    patterns: [
      { pattern: mainLower, role: 'main' },
      { pattern: mainUpper, role: 'main' },
      { pattern: secondaryUpper, role: 'secondary' },
      { pattern: 'isolation_upper', role: 'accessory' },
      { pattern: 'core', role: 'accessory' },
    ],
  };
}

function upperDay(title: string, mainPattern: MovementPattern): DayTemplate {
  const secondary: MovementPattern =
    mainPattern === 'horizontal_push'
      ? 'horizontal_pull'
      : mainPattern === 'vertical_pull'
      ? 'vertical_push'
      : 'horizontal_pull';
  return {
    title,
    splitType: 'upper',
    patterns: [
      { pattern: mainPattern, role: 'main' },
      { pattern: secondary, role: 'main' },
      { pattern: 'vertical_push', role: 'secondary' },
      { pattern: 'isolation_upper', role: 'accessory', muscleBias: ['biceps'] },
      { pattern: 'isolation_upper', role: 'accessory', muscleBias: ['triceps'] },
      { pattern: 'isolation_upper', role: 'accessory', muscleBias: ['lateral_deltoid', 'rear_deltoid'] },
    ],
  };
}

function lowerDay(title: string, mainPattern: MovementPattern): DayTemplate {
  return {
    title,
    splitType: 'lower',
    patterns: [
      { pattern: mainPattern, role: 'main' },
      {
        pattern: mainPattern === 'squat' ? 'hinge' : 'squat',
        role: 'secondary',
      },
      { pattern: 'unilateral_quad', role: 'secondary' },
      { pattern: 'isolation_lower', role: 'accessory', muscleBias: ['hamstrings'] },
      { pattern: 'isolation_lower', role: 'accessory', muscleBias: ['gastrocnemius', 'soleus'] },
      { pattern: 'core', role: 'accessory' },
    ],
  };
}

function pushDay(title: string): DayTemplate {
  return {
    title,
    splitType: 'push',
    patterns: [
      { pattern: 'horizontal_push', role: 'main' },
      { pattern: 'vertical_push', role: 'main' },
      { pattern: 'horizontal_push', role: 'secondary', muscleBias: ['upper_chest', 'chest'] },
      { pattern: 'isolation_upper', role: 'accessory', muscleBias: ['lateral_deltoid'] },
      { pattern: 'isolation_upper', role: 'accessory', muscleBias: ['triceps'] },
    ],
  };
}

function pullDay(title: string): DayTemplate {
  return {
    title,
    splitType: 'pull',
    patterns: [
      { pattern: 'vertical_pull', role: 'main' },
      { pattern: 'horizontal_pull', role: 'main' },
      { pattern: 'horizontal_pull', role: 'secondary' },
      { pattern: 'isolation_upper', role: 'accessory', muscleBias: ['rear_deltoid', 'rhomboids'] },
      { pattern: 'isolation_upper', role: 'accessory', muscleBias: ['biceps'] },
    ],
  };
}

function legsDay(title: string, mainPattern: MovementPattern): DayTemplate {
  return {
    title,
    splitType: 'legs',
    patterns: [
      { pattern: mainPattern, role: 'main' },
      { pattern: mainPattern === 'squat' ? 'hinge' : 'squat', role: 'secondary' },
      { pattern: 'unilateral_quad', role: 'secondary' },
      { pattern: 'isolation_lower', role: 'accessory', muscleBias: ['quads'] },
      { pattern: 'isolation_lower', role: 'accessory', muscleBias: ['hamstrings'] },
      { pattern: 'isolation_lower', role: 'accessory', muscleBias: ['gastrocnemius', 'soleus'] },
    ],
  };
}

// ---------------------------------------------------------------------------
// Couche 2 (suite) — Ordre des jours sur la semaine
// ---------------------------------------------------------------------------

/**
 * Invariant : pas de pattern principal identique 2 jours consécutifs.
 * Pour un split N jours, on veut aussi répartir la fatigue (alterner
 * haut / bas / push / pull) et commencer par les séances les plus lourdes.
 *
 * Stratégie : on génère toutes les permutations stables possibles via tri et
 * on retient la première qui respecte la contrainte "pas de répétition de
 * main pattern 2 jours d'affilée". Pour ≤ 6 jours c'est borné ; on utilise
 * un backtracking simple (pas de doublons stables).
 */
export function orderDays(days: DayTemplate[]): DayTemplate[] {
  const signature = (d: DayTemplate): string =>
    d.patterns.find((p) => p.role === 'main')?.pattern ?? d.splitType;

  // Backtracking déterministe : on privilégie l'ordre initial et on essaie
  // des permutations minimales seulement si l'invariant est violé.
  const solution: DayTemplate[] = [];
  const used = new Array(days.length).fill(false);

  function backtrack(position: number): boolean {
    if (position === days.length) return true;
    for (let i = 0; i < days.length; i++) {
      if (used[i]) continue;
      const candidate = days[i];
      if (position > 0) {
        const prev = solution[position - 1];
        if (signature(prev) === signature(candidate)) continue;
      }
      used[i] = true;
      solution.push(candidate);
      if (backtrack(position + 1)) return true;
      solution.pop();
      used[i] = false;
    }
    return false;
  }

  if (backtrack(0)) return solution;
  // Si l'invariant est impossible à satisfaire (ex : 2 séances avec même main
  // pattern uniquement), on retombe sur l'ordre initial — pathologie catalogue.
  return [...days];
}

// ---------------------------------------------------------------------------
// Couche 3 — Sélection des exercices
// ---------------------------------------------------------------------------

type FilterContext = {
  equipmentAllowed: Set<string>;
  forbiddenMuscles: Set<string>;
  forbiddenMorphoTags: Set<string>;
  avoidNameTokens: string[];
};

export const EQUIPMENT_AVAILABLE_BY_TYPE: Record<string, string[]> = {
  full_gym: [
    'barbell', 'ez_bar', 'trap_bar', 'safety_bar', 'bench', 'incline_bench',
    'decline_bench', 'rack', 'power_rack', 'pull_up_bar', 'dip_bars',
    'dip_belt', 'cable_machine', 'rope_attachment', 'row_attachment',
    'lat_bar', 'wide_bar', 'close_grip_bar', 'straight_bar',
    'smith_machine', 'dumbbell', 'kettlebell', 'weight_plate',
    'leg_press_machine', 'hack_squat_machine', 'leg_extension_machine',
    'leg_curl_machine', 'seated_leg_curl_machine', 'glute_ham_developer',
    'calf_raise_machine', 'seated_calf_machine', 'belt_squat_machine',
    'hip_abduction_machine', 'hip_adduction_machine', 'hip_thrust_machine',
    'chest_press_machine', 'shoulder_press_machine', 'pec_deck_machine',
    'lateral_raise_machine', 'reverse_fly_machine', 'row_machine',
    'pulldown_machine', 'assisted_pullup_machine', 'tricep_machine',
    'bicep_curl_machine', 'preacher_curl_machine', 'back_extension_bench',
    'reverse_hyper_machine', 'preacher_bench', 't_bar', 'landmine',
    'box', 'deficit_plates', 'blocks',
    'resistance_band', 'trx', 'gymnastic_rings', 'ab_wheel', 'yoke',
  ],
  home: [
    'barbell', 'ez_bar', 'bench', 'incline_bench', 'rack', 'pull_up_bar',
    'dip_bars', 'dip_belt', 'dumbbell', 'kettlebell', 'weight_plate',
    'resistance_band', 'ab_wheel', 'box', 'trap_bar',
  ],
  minimal: [
    'dumbbell', 'pull_up_bar', 'resistance_band', 'kettlebell',
  ],
};

function buildFilterContext(
  input: GenerationInput
): FilterContext {
  const equipmentType = input.answers.equipment ?? 'full_gym';
  const equipmentAllowed = new Set(
    EQUIPMENT_AVAILABLE_BY_TYPE[equipmentType] ?? EQUIPMENT_AVAILABLE_BY_TYPE.full_gym
  );

  const injuriesText = (input.answers.injuries ?? '').toLowerCase();
  const forbiddenMuscles = new Set<string>();
  const forbiddenMorphoTags = new Set<string>();

  // Correspondances simples : si la blessure mentionne une zone, on exclut
  // le pattern impliqué et on exige la compat morpho associée.
  if (/épaule|epaule|shoulder/i.test(injuriesText)) {
    forbiddenMorphoTags.add('axial_fatigue_high');
  }
  if (/lombaire|bas du dos|lower back|dos bas/i.test(injuriesText)) {
    forbiddenMorphoTags.add('axial_fatigue_high');
    forbiddenMuscles.add('lower_back');
  }
  if (/genou|knee/i.test(injuriesText)) {
    // Le tag quad_dominant signale des mouvements qui chargent fortement les
    // genoux. On l'exclut en priorité quand le genou est signalé.
    forbiddenMorphoTags.add('quad_dominant');
  }

  const avoidText = (input.answers.avoidExercises ?? '').toLowerCase();
  const avoidNameTokens = avoidText
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  return { equipmentAllowed, forbiddenMuscles, forbiddenMorphoTags, avoidNameTokens };
}

export function filterCatalogue(
  catalogue: Exercise[],
  ctx: FilterContext
): Exercise[] {
  return catalogue.filter((ex) => {
    // Équipement : tous les items requis doivent être dispo.
    // Liste vide = bodyweight → OK partout.
    const hasAllEquipment = ex.equipment.every((eq) =>
      ctx.equipmentAllowed.has(eq)
    );
    if (!hasAllEquipment) return false;

    // Morpho/blessure : si un tag est dans la liste interdite, exclure.
    if (ex.morphoTags.some((t) => ctx.forbiddenMorphoTags.has(t))) return false;

    // Muscles blessés : si primary muscle est dans la liste interdite, exclure.
    if (
      ex.primaryMuscles.some((m) => ctx.forbiddenMuscles.has(m))
    ) {
      return false;
    }

    // Exclusions nommées par l'utilisateur.
    const nameNormalized = `${ex.name} ${ex.nameFr ?? ''}`.toLowerCase();
    if (ctx.avoidNameTokens.some((token) => nameNormalized.includes(token))) {
      return false;
    }

    return true;
  });
}

// ---------------------------------------------------------------------------
// Scoring / sélection d'un exercice pour un slot donné
// ---------------------------------------------------------------------------

type SlotContext = {
  priorityMuscleTokens: Set<string>;
  goal: Goal;
  prefersStable: boolean;
};

function scoreExerciseForSlot(
  ex: Exercise,
  slot: DayPatternSlot,
  slotCtx: SlotContext
): number {
  let score = 0;

  // Priorité muscle : énorme bonus si primary match la priorité utilisateur
  const primaryHit = ex.primaryMuscles.some((m) =>
    slotCtx.priorityMuscleTokens.has(m)
  );
  if (primaryHit) score += 50;

  // Compat rôle : les mains privilégient movement_stability stable + fatigue haute
  if (slot.role === 'main') {
    if (ex.movementStability === 'stable') score += 20;
    if (ex.movementStability === 'moderate') score += 10;
    if (ex.systemicFatigue === 'high') score += 10;
    if (ex.category === 'compound') score += 15;
  } else if (slot.role === 'secondary') {
    if (ex.movementStability === 'stable') score += 15;
    if (ex.movementStability === 'moderate') score += 8;
    if (ex.systemicFatigue === 'moderate') score += 10;
    if (ex.category === 'compound') score += 10;
  } else {
    // accessory : low fatigue préféré, movement stable pour pilotabilité
    if (ex.morphoTags.includes('low_fatigue')) score += 15;
    if (ex.morphoTags.includes('stable_progression')) score += 10;
    if (ex.systemicFatigue === 'low') score += 10;
    if (ex.category === 'isolation' || ex.category === 'cable' || ex.category === 'machine') {
      score += 5;
    }
  }

  // Muscle bias de slot (ex : un accessoire triceps)
  if (slot.muscleBias && slot.muscleBias.length > 0) {
    const biasSet = new Set(slot.muscleBias);
    const biasHit = ex.primaryMuscles.some((m) => biasSet.has(m));
    if (biasHit) score += 30;
    else return -1; // sans bias respecté, pas éligible pour ce slot
  }

  // Objectif : strength favorise strength_fixed et high fatigue en main
  if (slotCtx.goal === 'strength' && slot.role === 'main') {
    if (ex.recommendedProgressionType === 'strength_fixed') score += 15;
  }
  if (slotCtx.goal === 'hypertrophy' && slot.role !== 'main') {
    if (ex.recommendedProgressionType === 'double_progression') score += 8;
    if (ex.recommendedProgressionType === 'accessory_linear') score += 5;
  }

  // Note : `prefersStable` renforce le bonus stabilité (durée séance courte)
  if (slotCtx.prefersStable && ex.movementStability !== 'stable') {
    score -= 5;
  }

  return score;
}

function pickExercisesForDay(
  day: DayTemplate,
  catalogue: Exercise[],
  slotCtx: SlotContext,
  warnings: GenerationWarning[]
): { exerciseId: string; role: PlannedExerciseRole; slotIndex: number }[] {
  const picked: {
    exerciseId: string;
    role: PlannedExerciseRole;
    slotIndex: number;
  }[] = [];
  const used = new Set<string>();

  day.patterns.forEach((slot, idx) => {
    const candidates = catalogue
      .filter((ex) => ex.movementPattern === slot.pattern)
      .map((ex) => ({ ex, score: scoreExerciseForSlot(ex, slot, slotCtx) }))
      .filter((c) => c.score >= 0 && !used.has(c.ex.id))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        // Tiebreaker stable : ordre alphabétique de l'id → reproductibilité.
        return a.ex.id.localeCompare(b.ex.id);
      });

    if (candidates.length === 0) {
      warnings.push({
        code:
          slot.role === 'main'
            ? 'missing_main'
            : slot.role === 'secondary'
            ? 'missing_secondary'
            : 'missing_accessory',
        message: `Aucun exercice compatible pour ${slot.pattern} (${slot.role}) dans la séance ${day.title}`,
        context: { pattern: slot.pattern, role: slot.role, day: day.title },
      });
      return;
    }

    const chosen = candidates[0].ex;
    picked.push({ exerciseId: chosen.id, role: slot.role, slotIndex: idx });
    used.add(chosen.id);
  });

  return picked;
}

// ---------------------------------------------------------------------------
// Couche 4 — Volume / reps / progression config
// ---------------------------------------------------------------------------

function computeSetsAndReps(
  role: PlannedExerciseRole,
  goal: Goal,
  level: TrainingLevel,
  volumeTolerance: VolumeToleranceLevel,
  applyLowerReduction: boolean,
  splitType: SplitType
): { sets: number; repMin: number; repMax: number; targetRir: number; restSeconds: number } {
  // Base sets par rôle et niveau
  let sets: number;
  if (role === 'main') sets = level === 'beginner' ? 3 : 4;
  else if (role === 'secondary') sets = 3;
  else sets = 3;

  // Tolérance volume : ajustement ±1 set
  if (volumeTolerance === 'high' && role !== 'main') sets += 1;
  if (volumeTolerance === 'low') sets = Math.max(2, sets - 1);

  // Réduction volume jambes si sport parallèle leg-heavy
  if (applyLowerReduction && (splitType === 'lower' || splitType === 'legs' || splitType === 'full')) {
    if (role !== 'main') sets = Math.max(2, sets - 1);
  }

  // Reps / RIR selon objectif + rôle
  let repMin = 8;
  let repMax = 12;
  let targetRir = 2;
  let restSeconds = 120;

  if (goal === 'strength') {
    if (role === 'main') {
      repMin = 3; repMax = 5; targetRir = 2; restSeconds = 210;
    } else if (role === 'secondary') {
      repMin = 5; repMax = 8; targetRir = 2; restSeconds = 150;
    } else {
      repMin = 8; repMax = 12; targetRir = 2; restSeconds = 90;
    }
  } else if (goal === 'hypertrophy') {
    if (role === 'main') {
      repMin = 5; repMax = 8; targetRir = 2; restSeconds = 180;
    } else if (role === 'secondary') {
      repMin = 8; repMax = 12; targetRir = 2; restSeconds = 120;
    } else {
      repMin = 10; repMax = 15; targetRir = 1; restSeconds = 75;
    }
  } else {
    // mixed : compromis 6-10 / 8-12 / 10-15
    if (role === 'main') {
      repMin = 4; repMax = 6; targetRir = 2; restSeconds = 180;
    } else if (role === 'secondary') {
      repMin = 8; repMax = 10; targetRir = 2; restSeconds = 120;
    } else {
      repMin = 10; repMax = 15; targetRir = 1; restSeconds = 75;
    }
  }

  return { sets, repMin, repMax, targetRir, restSeconds };
}

// Note : la résolution du progressionType + progressionConfig est
// centralisée dans `services/progression-config.ts` (cf. TA-22, ADR-014).

// ---------------------------------------------------------------------------
// Calibration des charges (docs §5.6)
// ---------------------------------------------------------------------------

export function calibrateLoad(
  history: GenerationHistoryEntry[] | undefined,
  exerciseId: string,
  targetReps: number,
  now: Date
): number | null {
  // Règle : si pas d'historique récent (< 8 semaines) sur cet exercice, null.
  if (!history || history.length === 0) return null;

  const recencyCutoff = now.getTime() - HISTORY_RECENCY_WEEKS * 7 * 24 * 60 * 60 * 1000;
  const relevant = history.filter(
    (h) => h.exerciseId === exerciseId && new Date(h.performedAt).getTime() >= recencyCutoff
  );
  if (relevant.length === 0) return null;

  // e1RM Epley par entrée, pondéré par récence (plus récent = poids plus fort).
  let weightedSum = 0;
  let weightTotal = 0;
  for (const entry of relevant) {
    if (entry.reps <= 0 || entry.load <= 0) continue;
    const e1rm = entry.load * (1 + entry.reps / 30);
    const ageMs = now.getTime() - new Date(entry.performedAt).getTime();
    const ageWeeks = ageMs / (7 * 24 * 60 * 60 * 1000);
    // Linéaire : poids = 1 à 0 sur [0, 8] semaines
    const w = Math.max(0, 1 - ageWeeks / HISTORY_RECENCY_WEEKS);
    if (w <= 0) continue;
    weightedSum += e1rm * w;
    weightTotal += w;
  }

  if (weightTotal === 0) return null;
  const e1rm = weightedSum / weightTotal;

  // Epley inverse pour déduire la charge à targetReps, puis marge prudente (-5%)
  // la première séance (cf §5.6 "calibration prudente").
  const estimatedLoad = e1rm / (1 + targetReps / 30);
  const prudent = estimatedLoad * 0.95;

  // Arrondi à 0.5 kg pour lisibilité.
  return Math.max(0, Math.round(prudent * 2) / 2);
}

// ---------------------------------------------------------------------------
// Assembly final
// ---------------------------------------------------------------------------

function deriveTitle(goal: Goal, split: GenerationSplitKind, frequency: number): string {
  const splitLabel: Record<GenerationSplitKind, string> = {
    full_body_ab: 'Full Body A/B',
    full_body_abc: 'Full Body A/B/C',
    upper_lower: 'Upper / Lower',
    upper_lower_upper_focus: 'Upper / Lower (priorité haut)',
    push_pull_legs: 'Push / Pull / Legs',
    push_pull_legs_upper_lower: 'PPL + Upper/Lower',
    push_pull_legs_x2: 'Push / Pull / Legs x2',
  };
  const goalLabel: Record<Goal, string> = {
    hypertrophy: 'Hypertrophie',
    strength: 'Force',
    mixed: 'Mixte',
  };
  return `${splitLabel[split]} — ${goalLabel[goal]} (${frequency}j)`;
}

function detectLegHeavySport(text: string, warnings: GenerationWarning[]): boolean {
  const normalized = text.trim().toLowerCase();
  if (normalized.length === 0) return false;
  const matches = LEG_IMPACT_SPORT_KEYWORDS.filter((kw) => normalized.includes(kw));
  if (matches.length === 0) {
    warnings.push({
      code: 'ignored_sport_keyword',
      message: `Sport parallèle non reconnu : "${text}". Aucune réduction de volume appliquée.`,
      context: { raw: text },
    });
    return false;
  }
  return true;
}

function priorityMuscleTokens(labels: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const label of labels) {
    const found = MUSCLE_LABEL_TO_TOKENS[label];
    if (found) for (const t of found) tokens.add(t);
  }
  return tokens;
}

function assertGenerationReady(
  answers: GenerationInput['answers']
): {
  goal: Goal;
  frequency: 3 | 4 | 5 | 6;
  level: TrainingLevel;
} {
  if (!answers.goal) throw new Error('generateProgram: answers.goal is required');
  if (!answers.frequencyDays) throw new Error('generateProgram: answers.frequencyDays is required');
  if (!answers.level) throw new Error('generateProgram: answers.level is required');
  return {
    goal: answers.goal,
    frequency: answers.frequencyDays,
    level: answers.level,
  };
}

export async function generateProgram(
  input: GenerationInput
): Promise<GenerationResult> {
  const warnings: GenerationWarning[] = [];
  const { goal, frequency, level } = assertGenerationReady(input.answers);
  const now = input.now ?? new Date();

  // 1. Split
  const { kind: splitKind, warning: splitWarning } = pickSplit(frequency, level);
  if (splitWarning) warnings.push(splitWarning);

  const template = buildSplitTemplate(splitKind, goal);

  // 2. Ordre des jours
  const orderedTemplates = orderDays(template.days);

  // 3. Filter catalogue
  const filterCtx = buildFilterContext(input);
  const catalogueFiltered = filterCatalogue(input.catalogue, filterCtx);

  if (catalogueFiltered.length < 20) {
    warnings.push({
      code: 'catalogue_thin',
      message: `Catalogue filtré très restreint (${catalogueFiltered.length}) — résultats possiblement dégradés`,
      context: { remaining: catalogueFiltered.length, equipment: input.answers.equipment },
    });
  }

  // 4. Détection sport leg-heavy
  const applyLowerReduction = detectLegHeavySport(
    input.answers.sportsParallel ?? '',
    warnings
  );

  // 5. Session duration preference → prefersStable quand temps court
  const prefersStable =
    input.answers.maxSessionDurationMin !== null &&
    input.answers.maxSessionDurationMin <= 60;

  const slotCtx: SlotContext = {
    priorityMuscleTokens: priorityMuscleTokens(input.answers.priorityMuscles),
    goal,
    prefersStable,

  };

  // 6. Génération : program + block + workout days + planned exercises
  const volumeTolerance: VolumeToleranceLevel =
    input.answers.volumeTolerance ?? 'medium';

  const programId = uuidv4();
  const blockId = uuidv4();

  const program: NewProgramInput = {
    id: programId,
    userId: input.userId,
    title: deriveTitle(goal, splitKind, frequency),
    goal,
    frequency,
    level,
    isActive: true,
  };

  const blockGoal: BlockGoal = goal === 'mixed' ? 'hypertrophy' : goal;

  const block: NewBlockInput = {
    id: blockId,
    programId,
    title: 'Bloc initial',
    goal: blockGoal,
    durationWeeks: BLOCK_DURATION_WEEKS,
    weekNumber: 1,
    status: 'active',
    deloadStrategy: level === 'advanced' ? 'scheduled' : 'fatigue_triggered',
  };

  const days: GenerationDayDraft[] = [];
  orderedTemplates.forEach((dayTemplate, dayIdx) => {
    const dayId = uuidv4();
    const picks = pickExercisesForDay(dayTemplate, catalogueFiltered, slotCtx, warnings);

    // Estimation durée : base 6 min/set main + 4 min/set secondary + 3 min/set accessory
    let estimatedMin = 8; // warm-up
    const plannedExercises: NewPlannedExerciseInput[] = picks.map((pick, order) => {
      const ex = catalogueFiltered.find((e) => e.id === pick.exerciseId)!;
      const { sets, repMin, repMax, targetRir, restSeconds } = computeSetsAndReps(
        pick.role,
        goal,
        level,
        volumeTolerance,
        applyLowerReduction,
        dayTemplate.splitType
      );
      estimatedMin += sets * (pick.role === 'main' ? 6 : pick.role === 'secondary' ? 4 : 3);

      // TA-22 : résolution du progressionType + progressionConfig.
      const { progressionType, progressionConfig } = assignProgressionConfig({
        exercise: ex,
        blockGoal,
        userLevel: level,
        role: pick.role,
        repRange: { min: repMin, max: repMax },
      });

      const targetMidReps = Math.round((repMin + repMax) / 2);
      const suggestedLoad =
        ex.logType === 'weight_reps'
          ? calibrateLoad(input.history, ex.id, targetMidReps, now)
          : null;

      return {
        id: uuidv4(),
        workoutDayId: dayId,
        exerciseId: ex.id,
        exerciseOrder: order,
        role: pick.role,
        sets,
        repRangeMin: repMin,
        repRangeMax: repMax,
        targetRir,
        restSeconds,
        tempo: null,
        progressionType,
        progressionConfig,
        notes: suggestedLoad !== null ? `Charge de départ suggérée : ${suggestedLoad} kg` : null,
      };
    });

    // Contrainte durée max : si dépassement, on tronque les accessoires en fin de séance
    if (input.answers.maxSessionDurationMin !== null) {
      while (
        estimatedMin > input.answers.maxSessionDurationMin &&
        plannedExercises.length > 0
      ) {
        const last = plannedExercises[plannedExercises.length - 1];
        if (last.role !== 'accessory') break;
        plannedExercises.pop();
        estimatedMin -= last.sets * 3;
      }
      // Ré-indexation après pop
      plannedExercises.forEach((pe, i) => {
        pe.exerciseOrder = i;
      });
    }

    const workoutDay: NewWorkoutDayInput = {
      id: dayId,
      blockId,
      title: dayTemplate.title,
      dayOrder: dayIdx,
      splitType: dayTemplate.splitType,
      estimatedDurationMin: estimatedMin,
    };

    days.push({ day: workoutDay, plannedExercises });
  });

  return {
    program,
    block,
    days,
    split: splitKind,
    warnings,
  };
}
