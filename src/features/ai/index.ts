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

// TA-133 — Prompts versionnés (4 cas d'usage)
export type { ClaudeMessages, ClaudeMessage, TextContentBlock, CacheControl } from './types/claude-messages';
export {
  buildSessionSummaryPrompt,
  buildPlateauAnalysisPrompt,
  buildBlockSummaryPrompt,
  buildExplainAdjustmentPrompt,
} from './domain/prompts';

// TA-135 — Génération et persistance du résumé fin de séance
export { generateAndStoreSessionSummary } from './api/session-summary-service';
export { enqueueAIRetry } from './api/retry-queue';
export type { AIRetryType, AIRetryQueueInput } from './api/retry-queue';
