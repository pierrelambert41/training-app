import { FallbackProvider } from './fallback-provider';
import type { AIContext } from '../types/ai-context';

const minimalProfile: AIContext['profile'] = {
  version: 1,
  user: {
    level: 'intermediate',
    goals: { primary: 'hypertrophy' },
    training_frequency: 4,
    preferred_unit: 'kg',
  },
  morphology: { strong_points: [], weak_points: [], injury_history: [] },
  exercise_preferences: { preferred: [], avoided: [], constraints: [] },
  performance_baselines: {},
  recent_highlights: [],
  coaching_style: 'direct',
  parallel_sports: [],
};

const baseContext: AIContext = {
  profile: minimalProfile,
  rulesEngineRecommendations: [],
};

describe('FallbackProvider', () => {
  const provider = new FallbackProvider();

  describe('generateSessionSummary', () => {
    it('returns a valid SessionSummary structure', async () => {
      const result = await provider.generateSessionSummary(baseContext);
      expect(result).toMatchObject({
        overall_rating: expect.stringMatching(/^(poor|average|good|excellent)$/),
        summary: expect.any(String),
        highlights: expect.any(Array),
        concerns: expect.any(Array),
        fatigue_note: expect.any(String),
        next_session_note: expect.any(String),
      });
    });

    it('counts sets from currentSession', async () => {
      const ctx: AIContext = {
        ...baseContext,
        currentSession: {
          sessionId: 's1',
          workoutDayTitle: 'Push',
          date: '2026-05-17',
          setLogs: [
            { exerciseId: 'e1', exerciseName: 'Bench', sets: [{ setNumber: 1, completed: true }, { setNumber: 2, completed: true }] },
            { exerciseId: 'e2', exerciseName: 'OHP', sets: [{ setNumber: 1, completed: true }] },
          ],
        },
      };
      const result = await provider.generateSessionSummary(ctx);
      expect(result.summary).toContain('2 exercices');
      expect(result.summary).toContain('3 séries');
    });

    it('handles empty session gracefully', async () => {
      const result = await provider.generateSessionSummary(baseContext);
      expect(result.summary).toContain('0 exercice');
    });
  });

  describe('generateRecommendation', () => {
    it('returns a valid Recommendation structure', async () => {
      const result = await provider.generateRecommendation(baseContext);
      expect(result).toMatchObject({
        message: expect.any(String),
        confidence: expect.any(Number),
      });
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('uses rules engine message when available', async () => {
      const ctx: AIContext = {
        ...baseContext,
        rulesEngineRecommendations: [
          { exerciseId: 'e1', type: 'progression', action: 'increase', message: 'Augmente la charge.' },
        ],
      };
      const result = await provider.generateRecommendation(ctx);
      expect(result.message).toBe('Augmente la charge.');
    });
  });

  describe('generateBlockSummary', () => {
    it('returns a valid BlockSummary structure', async () => {
      const result = await provider.generateBlockSummary(baseContext);
      expect(result).toMatchObject({
        title: expect.any(String),
        duration_weeks: expect.any(Number),
        overall_assessment: expect.any(String),
        top_progressions: expect.any(Array),
        stagnations: expect.any(Array),
        compliance_note: expect.any(String),
        next_block_recommendation: expect.any(String),
      });
    });

    it('includes compliance rate from profile', async () => {
      const ctx: AIContext = {
        ...baseContext,
        profile: {
          ...minimalProfile,
          current_block: { title: 'Bloc Hyper', goal: 'hypertrophy', week: 6, total_weeks: 6, compliance_rate: 0.88 },
        },
      };
      const result = await provider.generateBlockSummary(ctx);
      expect(result.title).toBe('Bloc Hyper');
      expect(result.compliance_note).toContain('88%');
    });
  });

  describe('analyzePlateau', () => {
    it('returns a valid PlateauAnalysis structure', async () => {
      const result = await provider.analyzePlateau(baseContext);
      expect(result).toMatchObject({
        exercise: expect.any(String),
        plateau_duration_weeks: expect.any(Number),
        probable_causes: expect.any(Array),
        suggestions: expect.any(Array),
      });
    });

    it('uses first exercise from history when available', async () => {
      const ctx: AIContext = {
        ...baseContext,
        exerciseHistory: [
          { exerciseId: 'e1', exerciseName: 'Squat', sessions: [] },
        ],
      };
      const result = await provider.analyzePlateau(ctx);
      expect(result.exercise).toBe('Squat');
    });
  });

  describe('explainAdjustment', () => {
    it('returns a non-empty string', async () => {
      const result = await provider.explainAdjustment(baseContext);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// TA-145 — generateProgram / regenerateBlock (wrapper moteur Phase 3)
// ---------------------------------------------------------------------------

import type { Exercise, ProgramQuestionnaire, Block } from '@/types';
import type {
  BlockRegenerationContext,
  ProgramGenerationContext,
  ValidationContext,
} from '../types/ai-generation';
import { validateAIGeneratedProgram } from '../domain/validate-ai-program';

function mkExercise(
  partial: Partial<Exercise> & Pick<Exercise, 'id' | 'name' | 'movementPattern' | 'primaryMuscles'>
): Exercise {
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

function buildCatalogue(): Exercise[] {
  return [
    mkExercise({ id: 'ex-bench', name: 'Bench Press', movementPattern: 'horizontal_push', primaryMuscles: ['chest'], equipment: ['barbell', 'bench'], systemicFatigue: 'high' }),
    mkExercise({ id: 'ex-db-press', name: 'DB Press', movementPattern: 'horizontal_push', primaryMuscles: ['chest'], equipment: ['dumbbell'] }),
    mkExercise({ id: 'ex-ohp', name: 'Overhead Press', movementPattern: 'vertical_push', primaryMuscles: ['front_deltoid'], equipment: ['barbell'] }),
    mkExercise({ id: 'ex-row', name: 'Barbell Row', movementPattern: 'horizontal_pull', primaryMuscles: ['lats'], equipment: ['barbell'] }),
    mkExercise({ id: 'ex-pullup', name: 'Pull-Up', movementPattern: 'vertical_pull', primaryMuscles: ['lats'], equipment: ['pull_up_bar'], category: 'bodyweight', logType: 'bodyweight_reps', recommendedProgressionType: 'bodyweight_progression' }),
    mkExercise({ id: 'ex-squat', name: 'Back Squat', movementPattern: 'squat', primaryMuscles: ['quads'], equipment: ['barbell', 'rack'], systemicFatigue: 'high' }),
    mkExercise({ id: 'ex-rdl', name: 'Romanian Deadlift', movementPattern: 'hinge', primaryMuscles: ['hamstrings'], equipment: ['barbell'], systemicFatigue: 'high' }),
    mkExercise({ id: 'ex-lunge', name: 'Lunge', movementPattern: 'unilateral_quad', primaryMuscles: ['quads'], equipment: ['dumbbell'], isUnilateral: true }),
    mkExercise({ id: 'ex-curl', name: 'Biceps Curl', movementPattern: 'elbow_flexion', primaryMuscles: ['biceps'], equipment: ['dumbbell'], category: 'isolation', recommendedProgressionType: 'accessory_linear' }),
    mkExercise({ id: 'ex-extension', name: 'Triceps Extension', movementPattern: 'elbow_extension', primaryMuscles: ['triceps'], equipment: ['cable_machine'], category: 'isolation', recommendedProgressionType: 'accessory_linear' }),
    mkExercise({ id: 'ex-raise', name: 'Lateral Raise', movementPattern: 'shoulder_isolation', primaryMuscles: ['side_deltoid'], equipment: ['dumbbell'], category: 'isolation', recommendedProgressionType: 'accessory_linear' }),
    mkExercise({ id: 'ex-legcurl', name: 'Leg Curl', movementPattern: 'knee_flexion', primaryMuscles: ['hamstrings'], equipment: ['leg_curl_machine'], category: 'machine', recommendedProgressionType: 'accessory_linear' }),
  ];
}

const generationProfile = {
  version: 1,
  user: { level: 'intermediate' as const, goals: { primary: 'hypertrophy' }, training_frequency: 3, preferred_unit: 'kg' as const },
  morphology: { strong_points: [], weak_points: [], injury_history: [] },
  exercise_preferences: { preferred: [], avoided: [], constraints: [] },
  performance_baselines: {},
  recent_highlights: [],
  coaching_style: 'direct' as const,
  parallel_sports: [],
};

const generationQuestionnaire: ProgramQuestionnaire = {
  goal: 'hypertrophy',
  frequencyDays: 3,
  preferredDays: null,
  level: 'intermediate',
  equipment: 'full_gym',
  injuries: '',
  avoidExercises: '',
  priorityMuscles: [],
  sportsParallel: '',
  maxSessionDurationMin: null,
  mixedPriority: null,
  volumeTolerance: 'medium',
  importHistory: false,
  weightKg: '',
  heightCm: '',
  readinessAvg: null,
  attendancePercent: null,
};

function makeValidationCtx(catalogue: Exercise[]): ValidationContext {
  return {
    catalogue,
    userConstraints: {
      equipmentAllowed: Array.from(new Set(catalogue.flatMap((e) => e.equipment))),
      forbiddenMuscles: [],
      forbiddenMorphoTags: [],
      maxSessionDurationMin: null,
    },
    frequencyDays: 3,
    level: 'intermediate',
  };
}

describe('FallbackProvider.generateProgram (TA-145)', () => {
  it('produit le schéma intermédiaire partagé depuis le moteur Phase 3', async () => {
    const provider = new FallbackProvider();
    const catalogue = buildCatalogue();
    const context: ProgramGenerationContext = {
      profile: generationProfile,
      questionnaire: generationQuestionnaire,
    };

    const output = await provider.generateProgram(context, catalogue, makeValidationCtx(catalogue));

    expect(output.split).toBe('full_body_abc');
    expect(output.weeks).toBeGreaterThan(0);
    expect(output.days).toHaveLength(3);
    for (const day of output.days) {
      expect(day.exercises.length).toBeGreaterThan(0);
      for (const ex of day.exercises) {
        expect(catalogue.some((c) => c.id === ex.exercise_id)).toBe(true);
        expect(ex.start_weight_kg).toBeNull();
        expect(typeof ex.reps).toBe('string');
      }
    }
  });

  it('la sortie du moteur passe le validateur déterministe (même contrat que ClaudeProvider)', async () => {
    const provider = new FallbackProvider();
    const catalogue = buildCatalogue();
    const output = await provider.generateProgram(
      { profile: generationProfile, questionnaire: generationQuestionnaire },
      catalogue,
      makeValidationCtx(catalogue)
    );

    const result = validateAIGeneratedProgram(output, makeValidationCtx(catalogue));
    expect(result.errors.filter((e) => e.blocking)).toEqual([]);
    expect(result.valid).toBe(true);
  });
});

describe('FallbackProvider.regenerateBlock (TA-145)', () => {
  it('régénère un bloc depuis les paramètres du bloc précédent + profil', async () => {
    const provider = new FallbackProvider();
    const catalogue = buildCatalogue();

    const previousBlock: Block = {
      id: 'block-1',
      programId: 'program-1',
      title: 'Bloc 1',
      goal: 'hypertrophy',
      durationWeeks: 6,
      weekNumber: 1,
      startDate: '2026-04-01',
      endDate: null,
      status: 'completed',
      deloadStrategy: 'fatigue_triggered',
      createdAt: '2026-04-01T00:00:00Z',
      updatedAt: '2026-05-12T00:00:00Z',
    };

    const context: BlockRegenerationContext = {
      profile: generationProfile,
      previousBlock,
      previousBlockStats: {
        complianceRate: 0.8,
        daysPerWeek: 3,
        exerciseProgress: [],
        avgFatigueScore: null,
        prs: [],
      },
      reason: 'end_of_block',
    };

    const output = await provider.regenerateBlock(context, catalogue, makeValidationCtx(catalogue));

    expect(output.days).toHaveLength(3);
    expect(output.split).toBe('full_body_abc');
    for (const day of output.days) {
      expect(day.exercises.length).toBeGreaterThan(0);
    }
  });
});
