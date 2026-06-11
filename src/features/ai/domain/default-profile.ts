import type { AIContextProfile } from '../types/ai-context';

/**
 * Profil neutre utilisé quand l'AIContextProfile n'a pas encore été construit
 * (premier lancement, refresh en attente). Cf. TA-132/TA-135.
 */
export function buildDefaultProfile(): AIContextProfile {
  return {
    version: 0,
    user: {
      level: 'intermediate',
      goals: { primary: 'hypertrophy' },
      training_frequency: 3,
      preferred_unit: 'kg',
    },
    morphology: { strong_points: [], weak_points: [], injury_history: [] },
    exercise_preferences: { preferred: [], avoided: [], constraints: [] },
    performance_baselines: {},
    recent_highlights: [],
    coaching_style: 'direct',
    parallel_sports: [],
  };
}
