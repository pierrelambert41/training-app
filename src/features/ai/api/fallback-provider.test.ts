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
