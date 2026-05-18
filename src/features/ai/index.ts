// Public API de la feature ai — complétée ticket par ticket (TA-131+)
export type {
  AIContext,
  AIContextProfile,
  AIContextProfileCurrentBlock,
  AIContextProfileExercisePreferences,
  AIContextProfileMorphology,
  AIContextProfilePerformanceBaseline,
  AIContextProfileReadinessTrends,
  AIContextProfileUser,
  RulesEngineRecommendation,
} from './types/ai-context';
export type {
  BlockSummary,
  PlateauAnalysis,
  Recommendation,
  SessionSummary,
} from './types/ai-responses';

// TA-131 — AIProvider interface + providers + factory
export type { AIProvider } from './api/ai-provider';
export { createAIProvider } from './api/create-ai-provider';
export type { AIProviderConfig } from './api/create-ai-provider';
