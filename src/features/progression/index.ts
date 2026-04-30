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
