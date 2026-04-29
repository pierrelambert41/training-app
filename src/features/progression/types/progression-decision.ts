import type {
  ProgressionType,
  StrengthFixedConfig,
  DoubleProgressionConfig,
  AccessoryLinearConfig,
  BodyweightProgressionConfig,
  DurationProgressionConfig,
  DistanceDurationConfig,
} from '@/types/planned-exercise';
import type { SetLog } from '@/types/set-log';

export type ProgressionAction = 'increase' | 'maintain' | 'decrease';

export interface ProgressionDecision {
  action: ProgressionAction;
  next_load: number | null;
  next_rep_target: number | null;
  next_rir_target: number | null;
  reason: string;
}

export interface ProgressionInput<TConfig> {
  config: TConfig;
  setLogs: SetLog[];
  history: ProgressionDecision[];
}

export type ComputeProgressionDecisionArgs =
  | {
      type: Extract<ProgressionType, 'strength_fixed'>;
      config: StrengthFixedConfig;
      setLogs: SetLog[];
      history: ProgressionDecision[];
    }
  | {
      type: Extract<ProgressionType, 'double_progression'>;
      config: DoubleProgressionConfig;
      setLogs: SetLog[];
      history: ProgressionDecision[];
    }
  | {
      type: Extract<ProgressionType, 'accessory_linear'>;
      config: AccessoryLinearConfig;
      setLogs: SetLog[];
      history: ProgressionDecision[];
    }
  | {
      type: Extract<ProgressionType, 'bodyweight_progression'>;
      config: BodyweightProgressionConfig;
      setLogs: SetLog[];
      history: ProgressionDecision[];
    }
  | {
      type: Extract<ProgressionType, 'duration_progression'>;
      config: DurationProgressionConfig;
      setLogs: SetLog[];
      history: ProgressionDecision[];
    }
  | {
      type: Extract<ProgressionType, 'distance_duration'>;
      config: DistanceDurationConfig;
      setLogs: SetLog[];
      history: ProgressionDecision[];
    };
