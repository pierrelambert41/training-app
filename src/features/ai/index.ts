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

// TA-136 — Explication d'ajustement à la demande
export { explainAdjustment } from './api/explain-adjustment-service';
export { useExplainAdjustment } from './hooks/use-explain-adjustment';

// TA-137 — Analyse de plateau à la demande
export { analyzePlateau } from './api/plateau-analysis-service';
export { usePlateauAnalysis } from './hooks/use-plateau-analysis';

// TA-138 — Résumé de bloc à la demande
export { generateBlockSummary } from './api/block-summary-service';
export { useBlockSummary } from './hooks/use-block-summary';

// TA-144 — ClaudeProvider.regenerateBlock + stats de bloc
export { regenerateBlockWithAI } from './api/regenerate-block-service';
export { transformAIOutputToBlock } from './domain/transform-ai-output';
export type { AIBlockResult, TransformBlockInput } from './domain/transform-ai-output';
export { computeBlockStats } from './domain/compute-block-stats';
export type { BlockStatsSetLog, ComputeBlockStatsInput } from './domain/compute-block-stats';

// TA-142 — ClaudeProvider.generateProgram + transformer + service
export { generateProgramWithAI } from './api/generate-program-service';
export { transformAIOutputToProgram } from './domain/transform-ai-output';
export type {
  AIGenerationResult,
  TransformDeps,
  TransformInput,
} from './domain/transform-ai-output';

// TA-147 — Prompts versionnés génération de programme
export {
  buildGenerateProgramPrompt,
  buildRegenerateBlockPrompt,
} from './domain/prompts';
export type {
  ProgramGenerationContext,
  BlockRegenerationContext,
  BlockStats,
  BlockExerciseProgress,
} from './types/ai-generation';

// TA-143 — Validateur déterministe post-IA (ADR-028)
export type {
  AIIntermediateOutput,
  AIIntermediateDay,
  AIIntermediateExercise,
  UserConstraints,
  ValidationContext,
  ValidationError,
  ValidationErrorCode,
  ValidationResult,
  AIProviderErrorCode,
} from './types/ai-generation';
export { AIProviderError, AIValidationExhaustedError } from './types/ai-generation';
export {
  validateAIGeneratedProgram,
  validSplitsForFrequency,
  ALLOWED_PROGRESSIONS,
} from './domain/validate-ai-program';

// TA-141 — Queue de retry des appels IA offline
export { processPendingAICalls } from './api/ai-queue-service';
export type { ProcessPendingResult } from './api/ai-queue-service';
export { AIQueueBridge } from './components/ai-queue-bridge';

// TA-140 — Composants d'affichage IA (Aujourd'hui + bloc)
export { AISummaryCard } from './components/ai-summary-card';
export { AIInsightBadge } from './components/ai-insight-badge';
export { inferHighlightSentiment } from './domain/highlight-sentiment';
export type { InsightSentiment } from './domain/highlight-sentiment';
export {
  useLatestSessionSummary,
  useStoredBlockSummary,
  useAIHighlights,
} from './hooks/use-ai-display-data';
