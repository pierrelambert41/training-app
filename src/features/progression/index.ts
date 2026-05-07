export { computeProgressionDecision } from './domain/compute-progression-decision';
export type { ProgressionDecision, ProgressionAction } from './types/progression-decision';

export { computeFatigueScore } from './domain/fatigue-score';
export type {
  FatigueInputs,
  FatigueScore,
  FatigueLevel,
  RecoveryLogSnapshot,
  CardioSessionSnapshot,
  PreSessionReadiness,
} from './domain/fatigue-score';

export { computeNextSessionPlan } from './domain/session-plan';
export type {
  SessionStatus,
  SessionPlan,
  ExercisePlan,
  SessionPlanInputs,
  RecoveryContext,
} from './domain/session-plan';

export { detectPlateau } from './domain/plateau-detection';
export type {
  ExerciseSession,
  PlateauAnalysis,
  PlateauRecommendation,
  PlateauRecommendationType,
} from './domain/plateau-detection';

export { shouldTriggerDeload, applyDeloadModifiers } from './domain/deload-rules';
export type {
  DeloadMode,
  DeloadDecision,
  RecentSessionSnapshot,
  FatigueHistoryEntry,
  ShouldTriggerDeloadInputs,
} from './domain/deload-rules';

export { computeProgressionVsPrevious } from './domain/progression-vs-previous';

export { runRulesEngine } from './api/rules-engine-service';
export type {
  RulesEngineResult,
  RunRulesEngineOptions,
} from './api/rules-engine-service';
