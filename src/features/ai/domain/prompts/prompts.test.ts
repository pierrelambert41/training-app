import type { AIContext, AIContextProfile } from '../../types/ai-context';
import type { Recommendation } from '../../types/ai-responses';
import { buildBlockSummaryPrompt } from './block-summary-prompt';
import { buildExplainAdjustmentPrompt } from './explain-adjustment-prompt';
import { buildPlateauAnalysisPrompt } from './plateau-analysis-prompt';
import { buildSessionSummaryPrompt } from './session-summary-prompt';

const minimalProfile: AIContextProfile = {
  version: 1,
  user: {
    level: 'intermediate',
    goals: { primary: 'hypertrophy' },
    training_frequency: 4,
    preferred_unit: 'kg',
  },
  morphology: {
    strong_points: [],
    weak_points: [],
    injury_history: [],
  },
  exercise_preferences: {
    preferred: [],
    avoided: [],
    constraints: [],
  },
  performance_baselines: {},
  recent_highlights: [],
  coaching_style: 'direct',
  parallel_sports: [],
};

const minimalContext: AIContext = {
  profile: minimalProfile,
  rulesEngineRecommendations: [],
};

function buildContextWithManyExerciseSessions(sessionCount: number): AIContext {
  return {
    profile: minimalProfile,
    rulesEngineRecommendations: [],
    exerciseHistory: [
      {
        exerciseId: 'ex-squat',
        exerciseName: 'Squat',
        sessions: Array.from({ length: sessionCount }, (_, i) => ({
          date: `2026-01-${String(i + 1).padStart(2, '0')}`,
          avgLoad: 100 + i,
          totalVolume: 2000 + i * 20,
        })),
      },
    ],
  };
}

const fullContext: AIContext = {
  profile: {
    ...minimalProfile,
    current_block: {
      title: 'Hypertrophie S3/6',
      goal: 'hypertrophy',
      week: 3,
      total_weeks: 6,
      compliance_rate: 0.92,
    },
    readiness_trends: {
      avg_sleep: 7.2,
      avg_energy: 6.5,
      avg_soreness: 4.0,
      fatigue_trend: 'stable',
    },
    recent_highlights: ['PR bench 100kg x 5'],
    performance_baselines: {
      bench_press: { e1rm: 110, trend: 'up', last_4w_avg: 105 },
      squat: { e1rm: 140, trend: 'plateau', last_4w_avg: 138 },
    },
  },
  currentSession: {
    sessionId: 'session-1',
    workoutDayTitle: 'Push A',
    date: '2026-05-18',
    setLogs: [
      {
        exerciseId: 'ex-bench',
        exerciseName: 'Bench Press',
        sets: [
          { setNumber: 1, load: 90, reps: 8, rir: 2, completed: true },
          { setNumber: 2, load: 90, reps: 7, rir: 1, completed: true },
        ],
      },
    ],
  },
  rulesEngineRecommendations: [
    {
      exerciseId: 'ex-bench',
      type: 'load_increase',
      action: 'Augmenter de 2.5kg',
      message: 'Reps cibles atteintes 2 séances de suite',
    },
  ],
  exerciseHistory: [
    {
      exerciseId: 'ex-squat',
      exerciseName: 'Squat',
      sessions: [
        { date: '2026-04-20', avgLoad: 130, totalVolume: 2600 },
        { date: '2026-04-27', avgLoad: 132, totalVolume: 2640 },
        { date: '2026-05-04', avgLoad: 132, totalVolume: 2640 },
        { date: '2026-05-11', avgLoad: 133, totalVolume: 2660 },
      ],
    },
  ],
};

describe('buildSessionSummaryPrompt', () => {
  it('retourne au moins un message user non vide avec le contexte minimal', () => {
    const result = buildSessionSummaryPrompt(minimalContext);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.length).toBeGreaterThan(0);
  });

  it('inclut un system prompt en français', () => {
    const result = buildSessionSummaryPrompt(minimalContext);

    expect(result.system).toBeDefined();
    expect(result.system).toContain('français');
  });

  it('marque le bloc profile avec cache_control ephemeral', () => {
    const result = buildSessionSummaryPrompt(fullContext);
    const profileBlock = result.messages[0].content.find(
      (b) => b.cache_control?.type === 'ephemeral'
    );

    expect(profileBlock).toBeDefined();
    expect(profileBlock?.text).toContain('"version"');
  });

  it('inclut l\'instruction de retourner du JSON', () => {
    const result = buildSessionSummaryPrompt(fullContext);
    const lastBlock = result.messages[0].content.at(-1);

    expect(lastBlock?.text).toContain('JSON');
  });

  it('inclut les données de séance dans le message user', () => {
    const result = buildSessionSummaryPrompt(fullContext);
    const combined = result.messages[0].content.map((b) => b.text).join('');

    expect(combined).toContain('Push A');
  });

  it('limite l\'historique de chaque exercice à 6 séances maximum (slice appliqué)', () => {
    const ctx = buildContextWithManyExerciseSessions(20);
    const result = buildSessionSummaryPrompt(ctx);
    const combined = result.messages[0].content.map((b) => b.text).join('');

    // Les 14 premières séances (index 0-13) ne doivent pas apparaître
    // La séance index 0 a avgLoad=100, date=2026-01-01
    expect(combined).not.toContain('"2026-01-01"');
    // La séance index 19 (la dernière) doit apparaître : avgLoad=119, date=2026-01-20
    expect(combined).toContain('"2026-01-20"');
  });
});

describe('buildPlateauAnalysisPrompt', () => {
  it('retourne au moins un message user non vide', () => {
    const result = buildPlateauAnalysisPrompt(minimalContext, 'ex-squat');

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.length).toBeGreaterThan(0);
  });

  it('inclut un system prompt en français', () => {
    const result = buildPlateauAnalysisPrompt(minimalContext, 'ex-squat');

    expect(result.system).toBeDefined();
    expect(result.system).toContain('français');
  });

  it('marque le bloc profile avec cache_control ephemeral', () => {
    const result = buildPlateauAnalysisPrompt(fullContext, 'ex-squat');
    const profileBlock = result.messages[0].content.find(
      (b) => b.cache_control?.type === 'ephemeral'
    );

    expect(profileBlock).toBeDefined();
  });

  it('inclut l\'historique de l\'exercice demandé', () => {
    const result = buildPlateauAnalysisPrompt(fullContext, 'ex-squat');
    const combined = result.messages[0].content.map((b) => b.text).join('');

    expect(combined).toContain('ex-squat');
  });

  it('gère un exerciseId inconnu sans crash', () => {
    const result = buildPlateauAnalysisPrompt(minimalContext, 'ex-unknown');

    expect(result.messages).toHaveLength(1);
    const combined = result.messages[0].content.map((b) => b.text).join('');
    expect(combined).toContain('ex-unknown');
  });

  it('transmet toutes les sessions reçues sans les tronquer (le cap est appliqué par le service en amont)', () => {
    const ctx = buildContextWithManyExerciseSessions(20);
    const result = buildPlateauAnalysisPrompt(ctx, 'ex-squat');
    const combined = result.messages[0].content.map((b) => b.text).join('');

    // Toutes les séances doivent être présentes : la limite est imposée par plateau-analysis-service
    expect(combined).toContain('"2026-01-01"');
    expect(combined).toContain('"2026-01-20"');
  });
});

describe('buildBlockSummaryPrompt', () => {
  it('retourne au moins un message user non vide', () => {
    const result = buildBlockSummaryPrompt(minimalContext);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.length).toBeGreaterThan(0);
  });

  it('inclut un system prompt en français', () => {
    const result = buildBlockSummaryPrompt(minimalContext);

    expect(result.system).toBeDefined();
    expect(result.system).toContain('français');
  });

  it('marque le bloc profile avec cache_control ephemeral', () => {
    const result = buildBlockSummaryPrompt(fullContext);
    const profileBlock = result.messages[0].content.find(
      (b) => b.cache_control?.type === 'ephemeral'
    );

    expect(profileBlock).toBeDefined();
  });

  it('inclut les données du bloc courant', () => {
    const result = buildBlockSummaryPrompt(fullContext);
    const combined = result.messages[0].content.map((b) => b.text).join('');

    expect(combined).toContain('Hypertrophie S3/6');
  });

  it('limite l\'historique de chaque exercice à 8 séances maximum (slice appliqué)', () => {
    const ctx = buildContextWithManyExerciseSessions(20);
    const result = buildBlockSummaryPrompt(ctx);
    const combined = result.messages[0].content.map((b) => b.text).join('');

    // Séances index 0-11 (dates 01-12) ne doivent pas apparaître
    expect(combined).not.toContain('"2026-01-01"');
    expect(combined).not.toContain('"2026-01-12"');
    // La séance index 13 (date 14, dans les 8 dernières) doit apparaître
    expect(combined).toContain('"2026-01-14"');
    // La dernière séance (date 20) doit apparaître
    expect(combined).toContain('"2026-01-20"');
  });
});

describe('buildExplainAdjustmentPrompt', () => {
  const recommendation: Recommendation = {
    message: 'Augmenter de 2.5kg',
    action: 'increase',
    confidence: 0.9,
    rationale: 'Progression régulière',
  };

  it('retourne au moins un message user non vide', () => {
    const result = buildExplainAdjustmentPrompt(minimalContext, recommendation);

    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].role).toBe('user');
    expect(result.messages[0].content.length).toBeGreaterThan(0);
  });

  it('inclut un system prompt en français', () => {
    const result = buildExplainAdjustmentPrompt(minimalContext, recommendation);

    expect(result.system).toBeDefined();
    expect(result.system).toContain('français');
  });

  it('marque le bloc profile avec cache_control ephemeral', () => {
    const result = buildExplainAdjustmentPrompt(fullContext, recommendation);
    const profileBlock = result.messages[0].content.find(
      (b) => b.cache_control?.type === 'ephemeral'
    );

    expect(profileBlock).toBeDefined();
  });

  it('inclut les données de la recommandation dans le message', () => {
    const result = buildExplainAdjustmentPrompt(fullContext, recommendation);
    const combined = result.messages[0].content.map((b) => b.text).join('');

    expect(combined).toContain('Augmenter de 2.5kg');
  });

  it('inclut l\'instruction de retourner du JSON', () => {
    const result = buildExplainAdjustmentPrompt(minimalContext, recommendation);
    const lastBlock = result.messages[0].content.at(-1);

    expect(lastBlock?.text).toContain('JSON');
  });
});
