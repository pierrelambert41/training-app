import { colors } from '@/theme/tokens';

export function repsColor(actual: number | null, target: number | null): string {
  if (actual === null || target === null) return colors.contentSecondary;
  if (actual >= target) return '#22c55e';
  if (actual >= target - 1) return '#f97316';
  return '#ef4444';
}
