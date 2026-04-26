import type { ExerciseCategory } from '@/types';
import type { UnplannedDefaults } from '../types/session-ui';

export function defaultsForCategory(category: ExerciseCategory | undefined): UnplannedDefaults {
  switch (category) {
    case 'compound':
      return { sets: 3, repRangeMin: 6, repRangeMax: 8, targetRir: 2, restSeconds: 180, progressionType: 'double_progression' };
    case 'bodyweight':
      return { sets: 3, repRangeMin: 8, repRangeMax: 12, targetRir: 2, restSeconds: 90, progressionType: 'bodyweight_progression' };
    default:
      return { sets: 3, repRangeMin: 10, repRangeMax: 15, targetRir: 2, restSeconds: 60, progressionType: 'accessory_linear' };
  }
}
