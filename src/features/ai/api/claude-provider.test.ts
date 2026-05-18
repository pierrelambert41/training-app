import { ClaudeProvider } from './claude-provider';
import type { AIContext } from '../types/ai-context';
import type { SupabaseClient } from '@supabase/supabase-js';

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

function makeSupabase(
  response: { data: unknown; error: unknown }
): SupabaseClient {
  return {
    functions: {
      invoke: jest.fn().mockResolvedValue(response),
    },
  } as unknown as SupabaseClient;
}

describe('ClaudeProvider — fallback on invoke failure', () => {
  it('falls back to FallbackProvider when invoke returns error', async () => {
    const supabase = makeSupabase({ data: null, error: new Error('network error') });
    const provider = new ClaudeProvider(supabase);
    const result = await provider.generateSessionSummary(baseContext);
    expect(result).toMatchObject({
      overall_rating: expect.stringMatching(/^(poor|average|good|excellent)$/),
      summary: expect.any(String),
    });
  });

  it('falls back when invoke throws', async () => {
    const supabase = {
      functions: {
        invoke: jest.fn().mockRejectedValue(new Error('timeout')),
      },
    } as unknown as SupabaseClient;
    const provider = new ClaudeProvider(supabase);
    const result = await provider.generateSessionSummary(baseContext);
    expect(result.summary).toBeTruthy();
  });

  it('falls back when data has no content', async () => {
    const supabase = makeSupabase({ data: { content: [] }, error: null });
    const provider = new ClaudeProvider(supabase);
    const result = await provider.generateSessionSummary(baseContext);
    expect(result).toMatchObject({ overall_rating: expect.any(String) });
  });

  it('falls back for generateRecommendation on error', async () => {
    const supabase = makeSupabase({ data: null, error: new Error('429') });
    const provider = new ClaudeProvider(supabase);
    const result = await provider.generateRecommendation(baseContext);
    expect(result).toMatchObject({ message: expect.any(String), confidence: expect.any(Number) });
  });

  it('falls back for generateBlockSummary on error', async () => {
    const supabase = makeSupabase({ data: null, error: new Error('rate limit') });
    const provider = new ClaudeProvider(supabase);
    const result = await provider.generateBlockSummary(baseContext);
    expect(result).toMatchObject({ title: expect.any(String), duration_weeks: expect.any(Number) });
  });

  it('falls back for analyzePlateau on error', async () => {
    const supabase = makeSupabase({ data: null, error: new Error('503') });
    const provider = new ClaudeProvider(supabase);
    const result = await provider.analyzePlateau(baseContext);
    expect(result).toMatchObject({ exercise: expect.any(String), probable_causes: expect.any(Array) });
  });

  it('falls back for explainAdjustment on error', async () => {
    const supabase = makeSupabase({ data: null, error: new Error('fail') });
    const provider = new ClaudeProvider(supabase);
    const result = await provider.explainAdjustment(baseContext);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('returns parsed response when invoke succeeds', async () => {
    const summary = {
      overall_rating: 'good',
      summary: 'Bonne séance.',
      highlights: [],
      concerns: [],
      fatigue_note: 'OK',
      next_session_note: 'Continuez.',
    };
    const supabase = makeSupabase({
      data: { content: [{ type: 'text', text: JSON.stringify(summary) }] },
      error: null,
    });
    const provider = new ClaudeProvider(supabase);
    const result = await provider.generateSessionSummary(baseContext);
    expect(result.overall_rating).toBe('good');
    expect(result.summary).toBe('Bonne séance.');
  });
});
