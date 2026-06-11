import { colors } from '@/theme/tokens';

export function repsColor(actual: number | null, target: number | null): string {
  if (actual === null || target === null) return colors.contentSecondary;
  if (actual >= target) return colors.statusSuccess;
  if (actual >= target - 1) return colors.statusWarning;
  return colors.statusDanger;
}
