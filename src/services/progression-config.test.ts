/**
 * TA-22 — Tests d'`assignProgressionConfig`.
 *
 * Couvre :
 *   - les 6 progressionTypes × débutant/avancé (intermédiaire en référence
 *     pour quelques assertions)
 *   - la priorité `Exercise.recommendedProgressionType`
 *   - les fallbacks par catégorie / role / blockGoal / logType
 *   - les ajustements par niveau (incréments + tolérance échec)
 *   - les edge cases (repRange inversé, exercice sans recommended)
 */
import {
  assignProgressionConfig,
  buildProgressionConfig,
  resolveProgressionType,
} from './progression-config';
import type {
  AccessoryLinearConfig,
  BodyweightProgressionConfig,
  DistanceDurationConfig,
  DoubleProgressionConfig,
  DurationProgressionConfig,
  Exercise,
  StrengthFixedConfig,
} from '@/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function mkExercise(partial: Partial<Exercise> & Pick<Exercise, 'id' | 'movementPattern'>): Exercise {
  return {
    name: 'Test',
    nameFr: null,
    category: 'compound',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
    equipment: [],
    logType: 'weight_reps',
    isUnilateral: false,
    systemicFatigue: 'moderate',
    movementStability: 'stable',
    morphoTags: [],
    recommendedProgressionType: null,
    alternatives: [],
    coachingNotes: null,
    tags: [],
    isCustom: false,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

// ---------------------------------------------------------------------------
// resolveProgressionType
// ---------------------------------------------------------------------------

describe('resolveProgressionType', () => {
  it('priorise recommendedProgressionType quand présent (strength_fixed)', () => {
    const ex = mkExercise({
      id: 'ex-1',
      movementPattern: 'horizontal_push',
      recommendedProgressionType: 'strength_fixed',
      category: 'compound',
    });
    expect(resolveProgressionType(ex, 'hypertrophy', 'main')).toBe('strength_fixed');
  });

  it('priorise recommendedProgressionType même contre les fallbacks (accessory category)', () => {
    // Un exercice marqué `bodyweight` mais avec un recommended explicite
    // accessory_linear doit suivre le recommended.
    const ex = mkExercise({
      id: 'ex-2',
      movementPattern: 'isolation_upper',
      category: 'bodyweight',
      logType: 'bodyweight_reps',
      recommendedProgressionType: 'accessory_linear',
    });
    expect(resolveProgressionType(ex, 'hypertrophy', 'accessory')).toBe('accessory_linear');
  });

  it('fallback : logType=duration → duration_progression', () => {
    const ex = mkExercise({
      id: 'ex-plank',
      movementPattern: 'core',
      logType: 'duration',
      category: 'bodyweight',
    });
    expect(resolveProgressionType(ex, 'hypertrophy', 'accessory')).toBe('duration_progression');
  });

  it('fallback : logType=distance_duration → distance_duration', () => {
    const ex = mkExercise({
      id: 'ex-row',
      movementPattern: 'carry',
      logType: 'distance_duration',
    });
    expect(resolveProgressionType(ex, 'hypertrophy', 'main')).toBe('distance_duration');
  });

  it('fallback : category=bodyweight → bodyweight_progression', () => {
    const ex = mkExercise({
      id: 'ex-pullup',
      movementPattern: 'vertical_pull',
      category: 'bodyweight',
      logType: 'bodyweight_reps',
    });
    expect(resolveProgressionType(ex, 'hypertrophy', 'main')).toBe('bodyweight_progression');
  });

  it('fallback : role=accessory → accessory_linear', () => {
    const ex = mkExercise({
      id: 'ex-curl',
      movementPattern: 'isolation_upper',
      category: 'isolation',
    });
    expect(resolveProgressionType(ex, 'hypertrophy', 'accessory')).toBe('accessory_linear');
  });

  it('fallback : role=main + compound + blockGoal=strength → strength_fixed', () => {
    const ex = mkExercise({
      id: 'ex-bench',
      movementPattern: 'horizontal_push',
      category: 'compound',
    });
    expect(resolveProgressionType(ex, 'strength', 'main')).toBe('strength_fixed');
  });

  it('fallback : role=main + compound + blockGoal=peaking → strength_fixed', () => {
    const ex = mkExercise({
      id: 'ex-bench',
      movementPattern: 'horizontal_push',
      category: 'compound',
    });
    expect(resolveProgressionType(ex, 'peaking', 'main')).toBe('strength_fixed');
  });

  it('fallback : role=main + compound + blockGoal=hypertrophy → double_progression', () => {
    const ex = mkExercise({
      id: 'ex-bench',
      movementPattern: 'horizontal_push',
      category: 'compound',
    });
    expect(resolveProgressionType(ex, 'hypertrophy', 'main')).toBe('double_progression');
  });

  it('fallback : secondary + compound → double_progression (default)', () => {
    const ex = mkExercise({
      id: 'ex-row',
      movementPattern: 'horizontal_pull',
      category: 'compound',
    });
    expect(resolveProgressionType(ex, 'hypertrophy', 'secondary')).toBe('double_progression');
  });

  it('fallback : main + isolation (pas compound) → double_progression', () => {
    const ex = mkExercise({
      id: 'ex-iso',
      movementPattern: 'isolation_upper',
      category: 'isolation',
    });
    expect(resolveProgressionType(ex, 'strength', 'main')).toBe('double_progression');
  });
});

// ---------------------------------------------------------------------------
// buildProgressionConfig — strength_fixed
// ---------------------------------------------------------------------------

describe('buildProgressionConfig — strength_fixed', () => {
  const ex = mkExercise({ id: 'e', movementPattern: 'horizontal_push' });

  it('débutant : incréments agressifs, reset_delta -2.5kg', () => {
    const cfg = buildProgressionConfig('strength_fixed', ex, 'beginner') as StrengthFixedConfig;
    expect(cfg.increment_upper_kg).toBe(2.5);
    expect(cfg.increment_lower_kg).toBe(5);
    expect(cfg.failures_before_reset).toBe(2);
    expect(cfg.reset_delta_kg).toBe(-2.5);
  });

  it('avancé : incréments fins, plus de tolérance à l\'échec', () => {
    const cfg = buildProgressionConfig('strength_fixed', ex, 'advanced') as StrengthFixedConfig;
    expect(cfg.increment_upper_kg).toBe(0.5);
    expect(cfg.increment_lower_kg).toBe(1.25);
    expect(cfg.failures_before_reset).toBe(3);
    expect(cfg.reset_delta_kg).toBe(-5);
  });

  it('intermédiaire : valeurs canoniques de la doc', () => {
    const cfg = buildProgressionConfig('strength_fixed', ex, 'intermediate') as StrengthFixedConfig;
    expect(cfg.increment_upper_kg).toBe(1.25);
    expect(cfg.increment_lower_kg).toBe(2.5);
    expect(cfg.rir_threshold_increase).toBe(2);
    expect(cfg.failures_before_reset).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// buildProgressionConfig — double_progression
// ---------------------------------------------------------------------------

describe('buildProgressionConfig — double_progression', () => {
  const upperEx = mkExercise({ id: 'u', movementPattern: 'horizontal_push' });
  const lowerEx = mkExercise({ id: 'l', movementPattern: 'squat' });

  it('débutant haut du corps : increment 2.5kg', () => {
    const cfg = buildProgressionConfig(
      'double_progression',
      upperEx,
      'beginner',
      { min: 6, max: 8 }
    ) as DoubleProgressionConfig;
    expect(cfg.increment_kg).toBe(2.5);
    expect(cfg.min_reps).toBe(6);
    expect(cfg.max_reps).toBe(8);
    expect(cfg.all_sets_at_max_to_increase).toBe(true);
    expect(cfg.regressions_before_alert).toBe(2);
  });

  it('débutant bas du corps : increment 5kg (plus agressif)', () => {
    const cfg = buildProgressionConfig(
      'double_progression',
      lowerEx,
      'beginner',
      { min: 8, max: 10 }
    ) as DoubleProgressionConfig;
    expect(cfg.increment_kg).toBe(5);
  });

  it('avancé haut du corps : increment 0.5kg + regressions_before_alert 3', () => {
    const cfg = buildProgressionConfig(
      'double_progression',
      upperEx,
      'advanced',
      { min: 8, max: 12 }
    ) as DoubleProgressionConfig;
    expect(cfg.increment_kg).toBe(0.5);
    expect(cfg.regressions_before_alert).toBe(3);
  });

  it('avancé bas du corps : increment 1.25kg', () => {
    const cfg = buildProgressionConfig(
      'double_progression',
      lowerEx,
      'advanced',
      { min: 5, max: 8 }
    ) as DoubleProgressionConfig;
    expect(cfg.increment_kg).toBe(1.25);
  });

  it('repRange absent → fallback 8-12', () => {
    const cfg = buildProgressionConfig(
      'double_progression',
      upperEx,
      'intermediate'
    ) as DoubleProgressionConfig;
    expect(cfg.min_reps).toBe(8);
    expect(cfg.max_reps).toBe(12);
  });

  it('repRange inversé (min > max) → swap defensive', () => {
    const cfg = buildProgressionConfig(
      'double_progression',
      upperEx,
      'intermediate',
      { min: 12, max: 6 }
    ) as DoubleProgressionConfig;
    expect(cfg.min_reps).toBe(6);
    expect(cfg.max_reps).toBe(12);
    expect(cfg.min_reps).toBeLessThanOrEqual(cfg.max_reps);
  });

  it('isolation_lower est traité comme bas du corps', () => {
    const isoLower = mkExercise({ id: 'il', movementPattern: 'isolation_lower' });
    const cfg = buildProgressionConfig(
      'double_progression',
      isoLower,
      'intermediate'
    ) as DoubleProgressionConfig;
    expect(cfg.increment_kg).toBe(2.5);
  });
});

// ---------------------------------------------------------------------------
// buildProgressionConfig — accessory_linear
// ---------------------------------------------------------------------------

describe('buildProgressionConfig — accessory_linear', () => {
  const ex = mkExercise({ id: 'a', movementPattern: 'isolation_upper', category: 'isolation' });

  it('débutant : increment 2.5kg', () => {
    const cfg = buildProgressionConfig(
      'accessory_linear',
      ex,
      'beginner',
      { min: 10, max: 15 }
    ) as AccessoryLinearConfig;
    expect(cfg.increment_kg).toBe(2.5);
    expect(cfg.min_reps).toBe(10);
    expect(cfg.max_reps).toBe(15);
    expect(cfg.all_sets_at_max_to_increase).toBe(true);
  });

  it('avancé : increment 0.5kg', () => {
    const cfg = buildProgressionConfig(
      'accessory_linear',
      ex,
      'advanced',
      { min: 12, max: 15 }
    ) as AccessoryLinearConfig;
    expect(cfg.increment_kg).toBe(0.5);
  });

  it('repRange absent → fallback 10-15', () => {
    const cfg = buildProgressionConfig(
      'accessory_linear',
      ex,
      'intermediate'
    ) as AccessoryLinearConfig;
    expect(cfg.min_reps).toBe(10);
    expect(cfg.max_reps).toBe(15);
  });
});

// ---------------------------------------------------------------------------
// buildProgressionConfig — bodyweight_progression
// ---------------------------------------------------------------------------

describe('buildProgressionConfig — bodyweight_progression', () => {
  const ex = mkExercise({
    id: 'bw',
    movementPattern: 'vertical_pull',
    category: 'bodyweight',
    logType: 'bodyweight_reps',
  });

  it('débutant : increment lest 5kg', () => {
    const cfg = buildProgressionConfig(
      'bodyweight_progression',
      ex,
      'beginner',
      { min: 5, max: 10 }
    ) as BodyweightProgressionConfig;
    expect(cfg.increment_kg).toBe(5);
    expect(cfg.min_reps).toBe(5);
    expect(cfg.max_reps).toBe(10);
  });

  it('avancé : increment lest 1.25kg (micro-progression)', () => {
    const cfg = buildProgressionConfig(
      'bodyweight_progression',
      ex,
      'advanced',
      { min: 6, max: 10 }
    ) as BodyweightProgressionConfig;
    expect(cfg.increment_kg).toBe(1.25);
  });

  it('repRange absent → fallback 5-12', () => {
    const cfg = buildProgressionConfig(
      'bodyweight_progression',
      ex,
      'intermediate'
    ) as BodyweightProgressionConfig;
    expect(cfg.min_reps).toBe(5);
    expect(cfg.max_reps).toBe(12);
  });
});

// ---------------------------------------------------------------------------
// buildProgressionConfig — duration_progression
// ---------------------------------------------------------------------------

describe('buildProgressionConfig — duration_progression', () => {
  const ex = mkExercise({
    id: 'plk',
    movementPattern: 'core',
    logType: 'duration',
    category: 'bodyweight',
  });

  it('débutant : increment 10s, target 30s', () => {
    const cfg = buildProgressionConfig('duration_progression', ex, 'beginner') as DurationProgressionConfig;
    expect(cfg.increment_seconds).toBe(10);
    expect(cfg.target_seconds).toBe(30);
  });

  it('avancé : increment 5s, target 60s', () => {
    const cfg = buildProgressionConfig('duration_progression', ex, 'advanced') as DurationProgressionConfig;
    expect(cfg.increment_seconds).toBe(5);
    expect(cfg.target_seconds).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// buildProgressionConfig — distance_duration
// ---------------------------------------------------------------------------

describe('buildProgressionConfig — distance_duration', () => {
  const ex = mkExercise({
    id: 'cd',
    movementPattern: 'carry',
    logType: 'distance_duration',
  });

  it('débutant : cibles modestes', () => {
    const cfg = buildProgressionConfig('distance_duration', ex, 'beginner') as DistanceDurationConfig;
    expect(cfg.target_distance_meters).toBe(1000);
    expect(cfg.target_duration_seconds).toBe(360);
  });

  it('avancé : cibles élevées', () => {
    const cfg = buildProgressionConfig('distance_duration', ex, 'advanced') as DistanceDurationConfig;
    expect(cfg.target_distance_meters).toBe(2000);
    expect(cfg.target_duration_seconds).toBe(540);
  });
});

// ---------------------------------------------------------------------------
// assignProgressionConfig — intégration
// ---------------------------------------------------------------------------

describe('assignProgressionConfig (intégration)', () => {
  it('exercice avec recommendedProgressionType strength_fixed → utilise strength_fixed', () => {
    const ex = mkExercise({
      id: 'ex-bench',
      movementPattern: 'horizontal_push',
      category: 'compound',
      recommendedProgressionType: 'strength_fixed',
    });
    const out = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'hypertrophy',
      userLevel: 'intermediate',
      role: 'main',
    });
    expect(out.progressionType).toBe('strength_fixed');
    const cfg = out.progressionConfig as StrengthFixedConfig;
    expect(cfg.increment_upper_kg).toBe(1.25);
  });

  it('exercice sans recommended : main compound + strength → strength_fixed avec config débutant', () => {
    const ex = mkExercise({
      id: 'ex-squat',
      movementPattern: 'squat',
      category: 'compound',
      recommendedProgressionType: null,
    });
    const out = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'strength',
      userLevel: 'beginner',
      role: 'main',
    });
    expect(out.progressionType).toBe('strength_fixed');
    const cfg = out.progressionConfig as StrengthFixedConfig;
    expect(cfg.increment_lower_kg).toBe(5);
  });

  it('exercice sans recommended : main compound + hypertrophy → double_progression bas du corps', () => {
    const ex = mkExercise({
      id: 'ex-dl',
      movementPattern: 'hinge',
      category: 'compound',
      recommendedProgressionType: null,
    });
    const out = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'hypertrophy',
      userLevel: 'advanced',
      role: 'main',
      repRange: { min: 6, max: 10 },
    });
    expect(out.progressionType).toBe('double_progression');
    const cfg = out.progressionConfig as DoubleProgressionConfig;
    expect(cfg.increment_kg).toBe(1.25); // lower body, advanced
    expect(cfg.min_reps).toBe(6);
    expect(cfg.max_reps).toBe(10);
  });

  it('exercice sans recommended : accessory → accessory_linear', () => {
    const ex = mkExercise({
      id: 'ex-curl',
      movementPattern: 'isolation_upper',
      category: 'isolation',
      recommendedProgressionType: null,
    });
    const out = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'hypertrophy',
      userLevel: 'beginner',
      role: 'accessory',
      repRange: { min: 10, max: 15 },
    });
    expect(out.progressionType).toBe('accessory_linear');
    const cfg = out.progressionConfig as AccessoryLinearConfig;
    expect(cfg.increment_kg).toBe(2.5);
  });

  it('exercice bodyweight sans recommended : avancé → bodyweight_progression micro-incréments', () => {
    const ex = mkExercise({
      id: 'ex-pull',
      movementPattern: 'vertical_pull',
      category: 'bodyweight',
      logType: 'bodyweight_reps',
      recommendedProgressionType: null,
    });
    const out = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'hypertrophy',
      userLevel: 'advanced',
      role: 'main',
    });
    expect(out.progressionType).toBe('bodyweight_progression');
    const cfg = out.progressionConfig as BodyweightProgressionConfig;
    expect(cfg.increment_kg).toBe(1.25);
  });

  it('exercice duration sans recommended : débutant → duration_progression défaut', () => {
    const ex = mkExercise({
      id: 'ex-plank',
      movementPattern: 'core',
      logType: 'duration',
      category: 'bodyweight',
      recommendedProgressionType: null,
    });
    const out = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'hypertrophy',
      userLevel: 'beginner',
      role: 'accessory',
    });
    expect(out.progressionType).toBe('duration_progression');
    const cfg = out.progressionConfig as DurationProgressionConfig;
    expect(cfg.increment_seconds).toBe(10);
  });

  it('exercice distance_duration sans recommended : avancé → distance_duration ciblé', () => {
    const ex = mkExercise({
      id: 'ex-row-erg',
      movementPattern: 'carry',
      logType: 'distance_duration',
      recommendedProgressionType: null,
    });
    const out = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'hypertrophy',
      userLevel: 'advanced',
      role: 'secondary',
    });
    expect(out.progressionType).toBe('distance_duration');
    const cfg = out.progressionConfig as DistanceDurationConfig;
    expect(cfg.target_distance_meters).toBe(2000);
  });

  it('invariant : min_reps <= max_reps après assignment, tous types', () => {
    const cases: Array<{
      ex: Exercise;
      role: 'main' | 'secondary' | 'accessory';
      goal: 'strength' | 'hypertrophy';
      repRange?: { min: number; max: number };
    }> = [
      {
        ex: mkExercise({ id: '1', movementPattern: 'squat', category: 'compound' }),
        role: 'main',
        goal: 'hypertrophy',
        repRange: { min: 6, max: 10 },
      },
      {
        ex: mkExercise({ id: '2', movementPattern: 'isolation_upper', category: 'isolation' }),
        role: 'accessory',
        goal: 'hypertrophy',
        repRange: { min: 12, max: 15 },
      },
      {
        ex: mkExercise({
          id: '3',
          movementPattern: 'vertical_pull',
          category: 'bodyweight',
          logType: 'bodyweight_reps',
        }),
        role: 'main',
        goal: 'hypertrophy',
        repRange: { min: 5, max: 12 },
      },
    ];
    for (const lvl of ['beginner', 'intermediate', 'advanced'] as const) {
      for (const c of cases) {
        const out = assignProgressionConfig({
          exercise: c.ex,
          blockGoal: c.goal,
          userLevel: lvl,
          role: c.role,
          repRange: c.repRange,
        });
        const cfg = out.progressionConfig as Record<string, unknown>;
        if ('min_reps' in cfg && 'max_reps' in cfg) {
          expect(cfg.min_reps as number).toBeLessThanOrEqual(cfg.max_reps as number);
        }
      }
    }
  });

  it('purity : deux appels avec la même entrée renvoient des configs égales', () => {
    const ex = mkExercise({
      id: 'ex-bench',
      movementPattern: 'horizontal_push',
      category: 'compound',
      recommendedProgressionType: 'double_progression',
    });
    const a = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'hypertrophy',
      userLevel: 'intermediate',
      role: 'main',
      repRange: { min: 8, max: 12 },
    });
    const b = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'hypertrophy',
      userLevel: 'intermediate',
      role: 'main',
      repRange: { min: 8, max: 12 },
    });
    expect(a).toEqual(b);
    // Vérifie l'isolation : modifier le retour ne doit pas affecter l'autre.
    (a.progressionConfig as Record<string, unknown>).min_reps = 999;
    expect((b.progressionConfig as Record<string, unknown>).min_reps).not.toBe(999);
  });

  it('intermédiaire (référence) : strength_fixed → valeurs canoniques de la doc', () => {
    const ex = mkExercise({
      id: 'ex-bench',
      movementPattern: 'horizontal_push',
      category: 'compound',
      recommendedProgressionType: 'strength_fixed',
    });
    const out = assignProgressionConfig({
      exercise: ex,
      blockGoal: 'strength',
      userLevel: 'intermediate',
      role: 'main',
    });
    const cfg = out.progressionConfig as StrengthFixedConfig;
    expect(cfg).toEqual({
      increment_upper_kg: 1.25,
      increment_lower_kg: 2.5,
      rir_threshold_increase: 2,
      failures_before_reset: 2,
      reset_delta_kg: -2.5,
    });
  });
});
