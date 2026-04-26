import type { SetLog, SetLogSide } from '@/types';
import type { ProgressionType } from '@/types/planned-exercise';

export type UnplannedDefaults = {
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRir: number;
  restSeconds: number;
  progressionType: ProgressionType;
};

export type VirtualSetRow = {
  setNumber: number;
  side: SetLogSide | null;
  log: SetLog | null;
};
