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

// TA-132 — AIContextProfile builder + persistance
export { refreshAIContextProfile, getAIContextProfile } from './api/ai-context-service';
export type {
  BuildAIContextProfileInputs,
  ExerciseBaselineSnapshot,
  RecoveryLogSnapshot,
  SetLogSnapshot,
  UserProfileSnapshot,
  CurrentBlockSnapshot,
} from './domain/build-ai-context-profile';
export { buildAIContextProfile } from './domain/build-ai-context-profile';
