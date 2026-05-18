/**
 * AIContextProfile — persisté en SQLite et Supabase (table ai_context_profiles).
 * Représente le cache structuré du profil utilisateur pour les appels IA.
 * Créé/mis à jour par refreshAIContextProfile (TA-132).
 */
export type AIContextProfileUser = {
  level: 'beginner' | 'intermediate' | 'advanced';
  goals: { primary: string; secondary?: string };
  training_frequency: number;
  training_since?: string;
  height_cm?: number;
  weight_kg?: number;
  preferred_unit: 'kg' | 'lb';
};

export type AIContextProfileMorphology = {
  body_type?: string;
  strong_points: string[];
  weak_points: string[];
  injury_history: string[];
};

export type AIContextProfileExercisePreferences = {
  preferred: string[];
  avoided: string[];
  constraints: string[];
};

export type AIContextProfilePerformanceBaseline = {
  e1rm: number;
  trend: 'up' | 'down' | 'plateau' | 'stable';
  last_4w_avg: number;
};

export type AIContextProfileCurrentBlock = {
  title: string;
  goal: string;
  week: number;
  total_weeks: number;
  compliance_rate: number;
};

export type AIContextProfileReadinessTrends = {
  avg_sleep: number;
  avg_energy: number;
  avg_soreness: number;
  fatigue_trend: 'improving' | 'stable' | 'worsening';
};

/**
 * Format JSON du profil persisté (profile_json dans ai_context_profiles).
 * Le champ version s'incrémente à chaque refresh (ADR-027).
 */
export type AIContextProfile = {
  version: number;
  user: AIContextProfileUser;
  morphology: AIContextProfileMorphology;
  exercise_preferences: AIContextProfileExercisePreferences;
  performance_baselines: Record<string, AIContextProfilePerformanceBaseline>;
  current_block?: AIContextProfileCurrentBlock;
  readiness_trends?: AIContextProfileReadinessTrends;
  recent_highlights: string[];
  coaching_style: 'direct' | 'motivational' | 'analytical';
  parallel_sports: string[];
};

/**
 * Recommandation issue du rules engine, enrichissant le contexte envoyé à l'IA.
 */
export type RulesEngineRecommendation = {
  exerciseId: string;
  type: string;
  action: string;
  message: string;
  nextLoad?: number;
  nextRepTarget?: number;
  nextRirTarget?: number;
};

/**
 * AIContext — structure enrichie à la volée pour un appel IA donné.
 * Distinct de AIContextProfile (persisté) : combinaison du profil stocké
 * + données de la session courante + recommandations du moteur de règles.
 */
export type AIContext = {
  profile: AIContextProfile;
  currentSession?: {
    sessionId: string;
    workoutDayTitle: string;
    date: string;
    setLogs: {
      exerciseId: string;
      exerciseName: string;
      sets: Array<{
        setNumber: number;
        load?: number;
        reps?: number;
        rir?: number;
        completed: boolean;
      }>;
    }[];
    readiness?: number;
    energy?: number;
    sleepQuality?: number;
  };
  previousSession?: {
    sessionId: string;
    date: string;
    completionScore?: number;
    performanceScore?: number;
  };
  rulesEngineRecommendations: RulesEngineRecommendation[];
  exerciseHistory?: {
    exerciseId: string;
    exerciseName: string;
    sessions: Array<{
      date: string;
      avgLoad: number;
      totalVolume: number;
      e1rm?: number;
    }>;
  }[];
};
