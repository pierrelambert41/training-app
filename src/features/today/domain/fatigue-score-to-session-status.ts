import type { TodaySessionStatus } from '../types/today-recommendations';

export const VALID_SESSION_STATUSES: TodaySessionStatus[] = [
  'progression',
  'maintien',
  'allegee',
  'deload',
  'prudente',
  'aggressive',
];

export function fatigueScoreToSessionStatus(score: number | null): TodaySessionStatus | null {
  if (score === null) return null;
  if (score >= 9) return 'deload';
  if (score >= 7) return 'allegee';
  if (score >= 4) return 'maintien';
  return 'progression';
}
