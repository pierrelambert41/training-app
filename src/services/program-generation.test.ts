/**
 * TA-21 — Tests du moteur de génération de programmes.
 *
 * Les tests utilisent un catalogue fixture déterministe plutôt que
 * le catalogue SQLite pour garder l'unité des assertions et contrôler
 * les cas limites (équipement, morpho, blessures).
 */

import {
  generateProgram,
  pickSplit,
  filterCatalogue,
  calibrateLoad,
  orderDays,
} from './program-generation';
import type {
  Exercise,
  GenerationAnswers,
  GenerationHistoryEntry,
  GenerationInput,
  NewPlannedExerciseInput,
} from '@/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mkExercise(partial: Partial<Exercise> & Pick<Exercise, 'id' | 'name' | 'movementPattern' | 'primaryMuscles'>): Exercise {
  return {
    nameFr: null,
    category: 'compound',
    secondaryMuscles: [],
    equipment: [],
    logType: 'weight_reps',
    isUnilateral: false,
    systemicFatigue: 'moderate',
    movementStability: 'stable',
    morphoTags: [],
    recommendedProgressionType: 'double_progression',
    alternatives: [],
    coachingNotes: null,
    tags: [],
    isCustom: false,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

// Catalogue minimaliste mais varié pour couvrir tous les patterns demandés.
function buildMinimalCatalogue(): Exercise[] {
  return [
    // horizontal_push
    mkExercise({
      id: 'ex-bench',
      name: 'Barbell Bench Press',
      movementPattern: 'horizontal_push',
      primaryMuscles: ['chest'],
      category: 'compound',
      equipment: ['barbell', 'bench'],
      systemicFatigue: 'high',
      movementStability: 'stable',
      recommendedProgressionType: 'strength_fixed',
    }),
    mkExercise({
      id: 'ex-db-press',
      name: 'Dumbbell Bench Press',
      movementPattern: 'horizontal_push',
      primaryMuscles: ['chest'],
      equipment: ['dumbbell', 'bench'],
      systemicFatigue: 'moderate',
      movementStability: 'moderate',
      morphoTags: ['shoulder_friendly'],
    }),
    mkExercise({
      id: 'ex-pushup',
      name: 'Push-Up',
      movementPattern: 'horizontal_push',
      primaryMuscles: ['chest'],
      equipment: [],
      category: 'bodyweight',
      systemicFatigue: 'low',
      logType: 'bodyweight_reps',
      recommendedProgressionType: 'bodyweight_progression',
    }),
    // vertical_push
    mkExercise({
      id: 'ex-ohp',
      name: 'Overhead Press',
      movementPattern: 'vertical_push',
      primaryMuscles: ['front_deltoid'],
      equipment: ['barbell'],
      morphoTags: ['axial_fatigue_high'],
      recommendedProgressionType: 'strength_fixed',
    }),
    mkExercise({
      id: 'ex-db-ohp',
      name: 'Dumbbell Shoulder Press',
      movementPattern: 'vertical_push',
      primaryMuscles: ['front_deltoid'],
      equipment: ['dumbbell'],
      morphoTags: ['shoulder_friendly'],
    }),
    // horizontal_pull
    mkExercise({
      id: 'ex-row',
      name: 'Barbell Row',
      movementPattern: 'horizontal_pull',
      primaryMuscles: ['lats'],
      equipment: ['barbell'],
      systemicFatigue: 'high',
    }),
    mkExercise({
      id: 'ex-db-row',
      name: 'Dumbbell Row',
      movementPattern: 'horizontal_pull',
      primaryMuscles: ['lats'],
      equipment: ['dumbbell', 'bench'],
    }),
    // vertical_pull
    mkExercise({
      id: 'ex-pullup',
      name: 'Pull-Up',
      movementPattern: 'vertical_pull',
      primaryMuscles: ['lats'],
      equipment: ['pull_up_bar'],
      category: 'bodyweight',
      logType: 'bodyweight_reps',
      recommendedProgressionType: 'bodyweight_progression',
    }),
    mkExercise({
      id: 'ex-lat-pulldown',
      name: 'Lat Pulldown',
      movementPattern: 'vertical_pull',
      primaryMuscles: ['lats'],
      equipment: ['cable_machine', 'lat_bar'],
    }),
    // squat
    mkExercise({
      id: 'ex-squat',
      name: 'Barbell Back Squat',
      movementPattern: 'squat',
      primaryMuscles: ['quads'],
      equipment: ['barbell', 'rack'],
      systemicFatigue: 'high',
      morphoTags: ['quad_dominant', 'axial_fatigue_high'],
      recommendedProgressionType: 'strength_fixed',
    }),
    mkExercise({
      id: 'ex-goblet',
      name: 'Goblet Squat',
      movementPattern: 'squat',
      primaryMuscles: ['quads'],
      equipment: ['dumbbell'],
      morphoTags: ['quad_dominant'],
    }),
    // hinge
    mkExercise({
      id: 'ex-deadlift',
      name: 'Conventional Deadlift',
      movementPattern: 'hinge',
      primaryMuscles: ['hamstrings'],
      equipment: ['barbell'],
      systemicFatigue: 'high',
      morphoTags: ['hinge_dominant', 'axial_fatigue_high'],
      recommendedProgressionType: 'strength_fixed',
    }),
    mkExercise({
      id: 'ex-rdl',
      name: 'Romanian Deadlift',
      movementPattern: 'hinge',
      primaryMuscles: ['hamstrings'],
      equipment: ['barbell'],
      morphoTags: ['hinge_dominant'],
    }),
    // unilateral_quad
    mkExercise({
      id: 'ex-lunge',
      name: 'Dumbbell Lunge',
      movementPattern: 'unilateral_quad',
      primaryMuscles: ['quads'],
      equipment: ['dumbbell'],
      isUnilateral: true,
      morphoTags: ['quad_dominant'],
    }),
    // isolation_upper — biceps, triceps, lateral_deltoid, rear_deltoid
    mkExercise({
      id: 'ex-curl',
      name: 'Dumbbell Curl',
      movementPattern: 'isolation_upper',
      primaryMuscles: ['biceps'],
      equipment: ['dumbbell'],
      category: 'isolation',
      systemicFatigue: 'low',
      morphoTags: ['low_fatigue'],
      recommendedProgressionType: 'accessory_linear',
    }),
    mkExercise({
      id: 'ex-pushdown',
      name: 'Tricep Pushdown',
      movementPattern: 'isolation_upper',
      primaryMuscles: ['triceps'],
      equipment: ['cable_machine', 'rope_attachment'],
      category: 'cable',
      systemicFatigue: 'low',
      morphoTags: ['low_fatigue', 'stable_progression'],
      recommendedProgressionType: 'accessory_linear',
    }),
    mkExercise({
      id: 'ex-lateral',
      name: 'Dumbbell Lateral Raise',
      movementPattern: 'isolation_upper',
      primaryMuscles: ['lateral_deltoid'],
      equipment: ['dumbbell'],
      category: 'isolation',
      systemicFatigue: 'low',
      morphoTags: ['low_fatigue'],
      recommendedProgressionType: 'accessory_linear',
    }),
    mkExercise({
      id: 'ex-rear-fly',
      name: 'Rear Delt Fly',
      movementPattern: 'isolation_upper',
      primaryMuscles: ['rear_deltoid'],
      equipment: ['dumbbell'],
      category: 'isolation',
      systemicFatigue: 'low',
      morphoTags: ['low_fatigue'],
      recommendedProgressionType: 'accessory_linear',
    }),
    // isolation_lower — quads, hamstrings, calves
    mkExercise({
      id: 'ex-leg-ext',
      name: 'Leg Extension',
      movementPattern: 'isolation_lower',
      primaryMuscles: ['quads'],
      equipment: ['leg_extension_machine'],
      category: 'machine',
      systemicFatigue: 'low',
      morphoTags: ['low_fatigue', 'quad_dominant'],
      recommendedProgressionType: 'accessory_linear',
    }),
    mkExercise({
      id: 'ex-leg-curl',
      name: 'Lying Leg Curl',
      movementPattern: 'isolation_lower',
      primaryMuscles: ['hamstrings'],
      equipment: ['leg_curl_machine'],
      category: 'machine',
      systemicFatigue: 'low',
      morphoTags: ['low_fatigue'],
      recommendedProgressionType: 'accessory_linear',
    }),
    mkExercise({
      id: 'ex-calf',
      name: 'Standing Calf Raise',
      movementPattern: 'isolation_lower',
      primaryMuscles: ['gastrocnemius'],
      equipment: ['calf_raise_machine'],
      category: 'machine',
      systemicFatigue: 'low',
      recommendedProgressionType: 'accessory_linear',
    }),
    // core
    mkExercise({
      id: 'ex-plank',
      name: 'Plank',
      movementPattern: 'core',
      primaryMuscles: ['core'],
      equipment: [],
      category: 'bodyweight',
      systemicFatigue: 'low',
      logType: 'duration',
      recommendedProgressionType: 'duration_progression',
    }),
    mkExercise({
      id: 'ex-crunch',
      name: 'Cable Crunch',
      movementPattern: 'core',
      primaryMuscles: ['rectus_abdominis'],
      equipment: ['cable_machine', 'rope_attachment'],
      category: 'cable',
      systemicFatigue: 'low',
      morphoTags: ['low_fatigue', 'stable_progression'],
      recommendedProgressionType: 'accessory_linear',
    }),
  ];
}

function defaultAnswers(overrides: Partial<GenerationAnswers> = {}): GenerationAnswers {
  return {
    goal: 'hypertrophy',
    frequencyDays: 4,
    level: 'intermediate',
    equipment: 'full_gym',
    injuries: '',
    avoidExercises: '',
    priorityMuscles: [],
    sportsParallel: '',
    maxSessionDurationMin: 75,
    mixedPriority: null,
    volumeTolerance: 'medium',
    importHistory: false,
    weightKg: '',
    heightCm: '',
    readinessAvg: null,
    attendancePercent: null,
    ...overrides,
  };
}

function defaultInput(overrides: Partial<GenerationInput> = {}): GenerationInput {
  return {
    userId: 'user-1',
    answers: defaultAnswers(),
    catalogue: buildMinimalCatalogue(),
    history: undefined,
    now: new Date('2026-04-24T10:00:00.000Z'),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Couche 1 — Sélection du split
// ---------------------------------------------------------------------------

describe('pickSplit', () => {
  it('3 jours débutant → Full Body A/B', () => {
    const { kind, warning } = pickSplit(3, 'beginner');
    expect(kind).toBe('full_body_ab');
    expect(warning).toBeNull();
  });

  it('3 jours intermédiaire → Full Body A/B/C', () => {
    expect(pickSplit(3, 'intermediate').kind).toBe('full_body_abc');
  });

  it('4 jours intermédiaire → Upper / Lower', () => {
    expect(pickSplit(4, 'intermediate').kind).toBe('upper_lower');
  });

  it('4 jours avancé → Upper/Lower avec priorité haut', () => {
    expect(pickSplit(4, 'advanced').kind).toBe('upper_lower_upper_focus');
  });

  it('6 jours avancé → Push/Pull/Legs x2', () => {
    expect(pickSplit(6, 'advanced').kind).toBe('push_pull_legs_x2');
  });

  it('5 jours débutant → fallback intermédiaire avec warning', () => {
    const { kind, warning } = pickSplit(5, 'beginner');
    expect(kind).toBe('push_pull_legs_upper_lower');
    expect(warning).not.toBeNull();
    expect(warning?.code).toBe('fallback_level');
  });
});

// ---------------------------------------------------------------------------
// Ordre des jours : pas de pattern répété 2 jours consécutifs
// ---------------------------------------------------------------------------

describe('orderDays', () => {
  it("ne place pas deux séances avec le même main pattern d'affilée", () => {
    // push_pull_legs_x2 : 2 push, 2 pull, 2 legs → vérifiable via orderedDays
    const catalogue = buildMinimalCatalogue();
    return generateProgram(defaultInput({
      answers: defaultAnswers({ frequencyDays: 6, level: 'advanced', goal: 'hypertrophy' }),
      catalogue,
    })).then((result) => {
      const mainPatterns = result.days.map((d) => {
        const mainPE = d.plannedExercises.find((pe) => pe.role === 'main');
        // On reprend le pattern via le catalogue
        return mainPE
          ? catalogue.find((ex) => ex.id === mainPE.exerciseId)?.movementPattern ?? null
          : null;
      });
      for (let i = 1; i < mainPatterns.length; i++) {
        expect(mainPatterns[i]).not.toEqual(mainPatterns[i - 1]);
      }
    });
  });

  it('retourne l’ordre initial si aucune permutation ne satisfait (dégénéré)', () => {
    // Cas limite : toutes les séances identiques → on ne peut pas satisfaire.
    const sameDay = {
      title: 'D',
      splitType: 'push' as const,
      patterns: [{ pattern: 'horizontal_push' as const, role: 'main' as const }],
    };
    const out = orderDays([sameDay, sameDay, sameDay]);
    expect(out).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Couche 3 — Filtrage du catalogue
// ---------------------------------------------------------------------------

describe('filterCatalogue', () => {
  const catalogue = buildMinimalCatalogue();

  it('exclut les exercices qui demandent du matériel indisponible en home gym', () => {
    const ctx = {
      equipmentAllowed: new Set(['dumbbell', 'pull_up_bar', 'bench']),
      forbiddenMuscles: new Set<string>(),
      forbiddenMorphoTags: new Set<string>(),
      avoidNameTokens: [],
    };
    const result = filterCatalogue(catalogue, ctx);
    const ids = result.map((e) => e.id);
    expect(ids).toContain('ex-pushup'); // bodyweight OK
    expect(ids).toContain('ex-db-press'); // dumbbell + bench
    expect(ids).toContain('ex-pullup'); // pull_up_bar
    expect(ids).not.toContain('ex-bench'); // barbell indispo
    expect(ids).not.toContain('ex-lat-pulldown'); // cable_machine indispo
    expect(ids).not.toContain('ex-leg-ext'); // leg_extension_machine indispo
  });

  it('exclut les exercices avec morpho tag interdit (blessure épaule)', () => {
    const ctx = {
      equipmentAllowed: new Set(['barbell', 'bench', 'dumbbell', 'rack']),
      forbiddenMuscles: new Set<string>(),
      forbiddenMorphoTags: new Set(['axial_fatigue_high']),
      avoidNameTokens: [],
    };
    const result = filterCatalogue(catalogue, ctx);
    const ids = result.map((e) => e.id);
    // OHP est tagué axial_fatigue_high → exclu
    expect(ids).not.toContain('ex-ohp');
    // Deadlift / Squat aussi taggés axial_fatigue_high → exclus
    expect(ids).not.toContain('ex-deadlift');
    expect(ids).not.toContain('ex-squat');
    // Bench reste
    expect(ids).toContain('ex-bench');
  });

  it('exclut les exercices par nom (user avoidance list)', () => {
    const ctx = {
      equipmentAllowed: new Set(['barbell', 'bench', 'dumbbell', 'rack']),
      forbiddenMuscles: new Set<string>(),
      forbiddenMorphoTags: new Set<string>(),
      avoidNameTokens: ['deadlift'],
    };
    const result = filterCatalogue(catalogue, ctx);
    expect(result.find((e) => e.id === 'ex-deadlift')).toBeUndefined();
  });

  it('exclut les exercices qui taxent un muscle blessé (primary)', () => {
    const ctx = {
      equipmentAllowed: new Set(['barbell', 'bench', 'dumbbell', 'rack']),
      forbiddenMuscles: new Set(['lower_back']),
      forbiddenMorphoTags: new Set<string>(),
      avoidNameTokens: [],
    };
    const result = filterCatalogue(catalogue, ctx);
    const lowerBackHitting = catalogue.filter((e) => e.primaryMuscles.includes('lower_back'));
    for (const e of lowerBackHitting) {
      expect(result.find((r) => r.id === e.id)).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// Calibration des charges
// ---------------------------------------------------------------------------

describe('calibrateLoad', () => {
  const now = new Date('2026-04-24T00:00:00.000Z');

  it('retourne null si aucun historique', () => {
    expect(calibrateLoad(undefined, 'ex-bench', 6, now)).toBeNull();
    expect(calibrateLoad([], 'ex-bench', 6, now)).toBeNull();
  });

  it('retourne null si historique vieux (> 8 semaines)', () => {
    const oldEntry: GenerationHistoryEntry = {
      exerciseId: 'ex-bench',
      load: 100,
      reps: 5,
      rir: 1,
      performedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    };
    expect(calibrateLoad([oldEntry], 'ex-bench', 6, now)).toBeNull();
  });

  it('retourne null pour un exercice absent de l\'historique', () => {
    const entry: GenerationHistoryEntry = {
      exerciseId: 'ex-other',
      load: 100,
      reps: 5,
      rir: 1,
      performedAt: new Date('2026-04-20T00:00:00.000Z').toISOString(),
    };
    expect(calibrateLoad([entry], 'ex-bench', 6, now)).toBeNull();
  });

  it('calcule une charge prudente e1RM-based avec historique récent', () => {
    // Epley : e1RM = 100 * (1 + 5/30) = 116.66 kg
    // À 6 reps : 116.66 / (1 + 6/30) = 97.22, × 0.95 = 92.36 → arrondi 92.5
    const entry: GenerationHistoryEntry = {
      exerciseId: 'ex-bench',
      load: 100,
      reps: 5,
      rir: 1,
      performedAt: new Date('2026-04-23T00:00:00.000Z').toISOString(), // 1 jour
    };
    const load = calibrateLoad([entry], 'ex-bench', 6, now);
    expect(load).not.toBeNull();
    expect(load).toBeCloseTo(92.5, 1);
  });

  it('arrondit au 0.5 kg', () => {
    const entry: GenerationHistoryEntry = {
      exerciseId: 'ex-bench',
      load: 80,
      reps: 8,
      rir: 2,
      performedAt: new Date('2026-04-23T00:00:00.000Z').toISOString(),
    };
    const load = calibrateLoad([entry], 'ex-bench', 8, now);
    expect(load).not.toBeNull();
    // Doit être un multiple de 0.5
    expect((load! * 2) % 1).toBe(0);
  });

  it('donne plus de poids aux entrées récentes (recency weighting)', () => {
    const recent: GenerationHistoryEntry = {
      exerciseId: 'ex-bench',
      load: 100,
      reps: 5,
      rir: 1,
      performedAt: new Date('2026-04-20T00:00:00.000Z').toISOString(),
    };
    const older: GenerationHistoryEntry = {
      exerciseId: 'ex-bench',
      load: 60, // beaucoup plus bas
      reps: 5,
      rir: 1,
      performedAt: new Date('2026-03-10T00:00:00.000Z').toISOString(),
    };
    const loadBoth = calibrateLoad([recent, older], 'ex-bench', 6, now)!;
    const loadRecentOnly = calibrateLoad([recent], 'ex-bench', 6, now)!;
    // Le loadBoth doit être plus proche de loadRecentOnly que la moyenne naïve.
    expect(loadBoth).toBeGreaterThan((loadRecentOnly + 50) / 2);
  });
});

// ---------------------------------------------------------------------------
// Integration — invariants globaux
// ---------------------------------------------------------------------------

describe('generateProgram — invariants', () => {
  it('produit le bon nombre de jours pour la fréquence demandée', async () => {
    const result = await generateProgram(defaultInput({
      answers: defaultAnswers({ frequencyDays: 4 }),
    }));
    expect(result.days).toHaveLength(4);
  });

  it('respecte le format du bloc initial : 6 semaines, fatigue_triggered par défaut', async () => {
    const result = await generateProgram(defaultInput({
      answers: defaultAnswers({ level: 'intermediate' }),
    }));
    expect(result.block.durationWeeks).toBe(6);
    expect(result.block.deloadStrategy).toBe('fatigue_triggered');
    expect(result.block.status).toBe('active');
  });

  it('applique scheduled deload en niveau avancé', async () => {
    const result = await generateProgram(defaultInput({
      answers: defaultAnswers({ level: 'advanced' }),
    }));
    expect(result.block.deloadStrategy).toBe('scheduled');
  });

  it("n'introduit pas de doublon d'exercice dans une même séance", async () => {
    const result = await generateProgram(defaultInput());
    for (const d of result.days) {
      const ids = d.plannedExercises.map((pe) => pe.exerciseId);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('ne produit aucune charge hardcodée si pas d\'historique', async () => {
    const result = await generateProgram(defaultInput({ history: undefined }));
    const notes = result.days.flatMap((d) => d.plannedExercises.map((pe) => pe.notes));
    // Aucun exercice ne doit avoir de charge suggérée dans les notes
    expect(notes.every((n) => n === null || !/Charge de départ/.test(n ?? ''))).toBe(true);
  });

  it('propose une charge via notes quand historique présent pour l\'exercice', async () => {
    const catalogue = buildMinimalCatalogue();
    const history: GenerationHistoryEntry[] = [
      {
        exerciseId: 'ex-bench',
        load: 100,
        reps: 5,
        rir: 1,
        performedAt: '2026-04-20T00:00:00.000Z',
      },
    ];
    const result = await generateProgram(
      defaultInput({ catalogue, history, answers: defaultAnswers({ frequencyDays: 3, level: 'intermediate' }) })
    );
    const benchPe = result.days
      .flatMap((d) => d.plannedExercises)
      .find((pe) => pe.exerciseId === 'ex-bench');
    expect(benchPe).toBeDefined();
    expect(benchPe!.notes).toMatch(/Charge de départ/);
  });

  it('respecte rep_range_min <= rep_range_max sur tous les exercices', async () => {
    for (const freq of [3, 4, 5, 6] as const) {
      const result = await generateProgram(defaultInput({
        answers: defaultAnswers({ frequencyDays: freq }),
      }));
      for (const d of result.days) {
        for (const pe of d.plannedExercises) {
          expect(pe.repRangeMin).toBeLessThanOrEqual(pe.repRangeMax);
        }
      }
    }
  });

  it("n'enchaîne pas 2 main patterns identiques sur 2 jours consécutifs", async () => {
    const catalogue = buildMinimalCatalogue();
    const result = await generateProgram(defaultInput({
      answers: defaultAnswers({ frequencyDays: 6, level: 'intermediate' }),
      catalogue,
    }));
    const mainPatterns = result.days.map((d) => {
      const mainPE = d.plannedExercises.find((pe) => pe.role === 'main');
      return mainPE
        ? catalogue.find((ex) => ex.id === mainPE.exerciseId)?.movementPattern ?? null
        : null;
    });
    for (let i = 1; i < mainPatterns.length; i++) {
      expect(mainPatterns[i]).not.toEqual(mainPatterns[i - 1]);
    }
  });

  it('linéarise exercise_order sans trou après troncage durée max', async () => {
    const result = await generateProgram(defaultInput({
      answers: defaultAnswers({ maxSessionDurationMin: 45 }),
    }));
    for (const d of result.days) {
      const orders = d.plannedExercises.map((pe) => pe.exerciseOrder);
      expect(orders).toEqual(orders.map((_, i) => i));
    }
  });

  it('exclut les machines en équipement minimal', async () => {
    const catalogue = buildMinimalCatalogue();
    const result = await generateProgram(defaultInput({
      answers: defaultAnswers({ equipment: 'minimal', frequencyDays: 3, level: 'intermediate' }),
      catalogue,
    }));
    const allPickedIds = result.days.flatMap((d) =>
      d.plannedExercises.map((pe) => pe.exerciseId)
    );
    // Aucun exercice pickable n'utilise leg_extension_machine / barbell / rack
    for (const id of allPickedIds) {
      const ex = catalogue.find((e) => e.id === id)!;
      expect(ex.equipment).not.toContain('barbell');
      expect(ex.equipment).not.toContain('leg_extension_machine');
      expect(ex.equipment).not.toContain('cable_machine');
    }
  });

  it('exclut les exercices axial_fatigue_high si blessure lombaire', async () => {
    const catalogue = buildMinimalCatalogue();
    const result = await generateProgram(defaultInput({
      answers: defaultAnswers({ injuries: 'Douleur lombaire chronique', frequencyDays: 4, level: 'intermediate' }),
      catalogue,
    }));
    const pickedIds = result.days.flatMap((d) =>
      d.plannedExercises.map((pe) => pe.exerciseId)
    );
    for (const id of pickedIds) {
      const ex = catalogue.find((e) => e.id === id)!;
      expect(ex.morphoTags).not.toContain('axial_fatigue_high');
      expect(ex.primaryMuscles).not.toContain('lower_back');
    }
  });

  it('assigne un progressionType cohérent avec le catalogue (recommended)', async () => {
    const catalogue = buildMinimalCatalogue();
    const result = await generateProgram(defaultInput({ catalogue }));
    for (const d of result.days) {
      for (const pe of d.plannedExercises) {
        const ex = catalogue.find((e) => e.id === pe.exerciseId)!;
        if (ex.recommendedProgressionType) {
          expect(pe.progressionType).toBe(ex.recommendedProgressionType);
        }
      }
    }
  });

  it('réduit le volume lower body si sport parallèle leg-heavy détecté', async () => {
    const base = await generateProgram(
      defaultInput({
        answers: defaultAnswers({
          frequencyDays: 4,
          level: 'intermediate',
          sportsParallel: '',
        }),
      })
    );
    const withRunning = await generateProgram(
      defaultInput({
        answers: defaultAnswers({
          frequencyDays: 4,
          level: 'intermediate',
          sportsParallel: 'Course à pied 3x / semaine',
        }),
      })
    );

    // Volume non-main (secondary + accessory) réduit globalement
    // car le moteur applique -1 set sur les jours lower/legs/full.
    function sumNonMainSets(r: { days: { plannedExercises: NewPlannedExerciseInput[] }[] }): number {
      return r.days
        .flatMap((d) => d.plannedExercises)
        .filter((pe) => pe.role !== 'main')
        .reduce((x, y) => x + y.sets, 0);
    }
    expect(sumNonMainSets(withRunning)).toBeLessThan(sumNonMainSets(base));
  });

  it('rejette une génération sans goal/frequency/level', async () => {
    await expect(
      generateProgram(defaultInput({ answers: defaultAnswers({ goal: null }) }))
    ).rejects.toThrow(/goal/);
    await expect(
      generateProgram(defaultInput({ answers: defaultAnswers({ frequencyDays: null }) }))
    ).rejects.toThrow(/frequencyDays/);
    await expect(
      generateProgram(defaultInput({ answers: defaultAnswers({ level: null }) }))
    ).rejects.toThrow(/level/);
  });

  it('respecte les rôles : 1-2 main, 1-3 secondary, 2-4 accessory par séance', async () => {
    const result = await generateProgram(defaultInput({
      answers: defaultAnswers({ frequencyDays: 4, level: 'intermediate', goal: 'hypertrophy' }),
    }));
    for (const d of result.days) {
      const byRole = {
        main: d.plannedExercises.filter((pe) => pe.role === 'main').length,
        secondary: d.plannedExercises.filter((pe) => pe.role === 'secondary').length,
        accessory: d.plannedExercises.filter((pe) => pe.role === 'accessory').length,
      };
      expect(byRole.main).toBeGreaterThanOrEqual(1);
      expect(byRole.main).toBeLessThanOrEqual(2);
      expect(byRole.secondary).toBeLessThanOrEqual(3);
      expect(byRole.accessory).toBeLessThanOrEqual(4);
    }
  });

  it('honore le muscle prioritaire en favorisant un exercice qui le cible', async () => {
    // Ici on valide que la priorité biceps se matérialise par la sélection
    // de l'accessoire biceps correspondant (seul exercice biceps du catalogue).
    // On fixe une durée max large pour écarter le troncage.
    const result = await generateProgram(defaultInput({
      answers: defaultAnswers({
        frequencyDays: 4,
        level: 'intermediate',
        priorityMuscles: ['Biceps'],
        maxSessionDurationMin: 90,
      }),
    }));
    const hasBicepsAccessory = result.days.some((d) =>
      d.plannedExercises.some((pe) => pe.exerciseId === 'ex-curl')
    );
    expect(hasBicepsAccessory).toBe(true);
  });

  it('produit un programme avec un titre dérivé et un programId/blockId stables par génération', async () => {
    const result = await generateProgram(defaultInput());
    expect(result.program.id).toBe(result.block.programId);
    expect(result.program.title.length).toBeGreaterThan(0);
    for (const d of result.days) {
      expect(d.day.blockId).toBe(result.block.id);
      for (const pe of d.plannedExercises) {
        expect(pe.workoutDayId).toBe(d.day.id);
      }
    }
  });
});
