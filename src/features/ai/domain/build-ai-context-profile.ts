import { computeE1rm } from '@/lib/epley';
import type {
  AIContextProfile,
  AIContextProfileCurrentBlock,
  AIContextProfilePerformanceBaseline,
  AIContextProfileReadinessTrends,
} from '../types/ai-context';

/**
 * Snapshot d'un SetLog pour la construction du profil.
 * Les champs nullable représentent des données partielles (séances partielles, etc.).
 */
export type SetLogSnapshot = {
  exerciseId: string;
  exerciseName: string;
  load: number | null;
  reps: number | null;
  sessionDate: string;
};

/**
 * Snapshot d'une baseline d'exercice (table exercise_baselines — TA-127).
 */
export type ExerciseBaselineSnapshot = {
  exerciseId: string;
  exerciseName: string;
  bestE1rm: number;
  recentAvgLoad: number;
  calibratedAt: string;
};

/**
 * Snapshot d'un RecoveryLog (7 derniers jours).
 * Cf. pitfall PROG-02 : types globaux RecoveryLog non encore définis — dégradation gracieuse.
 */
export type RecoveryLogSnapshot = {
  date: string;
  sleepHours: number | null;
  energy: number | null;
  soreness: number | null;
};

/**
 * Snapshot de profil utilisateur.
 */
export type UserProfileSnapshot = {
  level: 'beginner' | 'intermediate' | 'advanced';
  goals: { primary: string; secondary?: string };
  trainingFrequency: number;
  trainingSince?: string;
  heightCm?: number;
  weightKg?: number;
  preferredUnit: 'kg' | 'lb';
  strongPoints?: string[];
  weakPoints?: string[];
  injuryHistory?: string[];
  preferredExercises?: string[];
  avoidedExercises?: string[];
  constraints?: string[];
  coachingStyle?: 'direct' | 'motivational' | 'analytical';
  parallelSports?: string[];
};

/**
 * Snapshot du bloc courant.
 */
export type CurrentBlockSnapshot = {
  title: string;
  goal: string;
  weekNumber: number;
  durationWeeks: number;
  totalSessions: number;
  completedSessions: number;
};

/**
 * Inputs pour buildAIContextProfile.
 * Toutes les sources optionnelles permettent la dégradation gracieuse.
 */
export type BuildAIContextProfileInputs = {
  userId: string;
  userProfile: UserProfileSnapshot;
  currentBlock?: CurrentBlockSnapshot;
  exerciseBaselines: ExerciseBaselineSnapshot[];
  recentSetLogs: SetLogSnapshot[];
  recoveryLogs: RecoveryLogSnapshot[];
  previousVersion?: number;
};

const PLATEAU_MIN_SESSIONS = 3;
const SLEEP_DEGRADATION_THRESHOLD_HOURS = 6;
const SLEEP_DEGRADATION_STREAK = 3;

/**
 * Construit un AIContextProfile (JSON structuré) à partir de snapshots de données SQLite.
 * Fonction PURE — aucun I/O, aucun effet de bord.
 *
 * Cf. docs/ai-strategy.md §3 pour le format JSON attendu.
 */
export function buildAIContextProfile(
  inputs: BuildAIContextProfileInputs
): AIContextProfile {
  const version = (inputs.previousVersion ?? 0) + 1;

  return {
    version,
    user: {
      level: inputs.userProfile.level,
      goals: inputs.userProfile.goals,
      training_frequency: inputs.userProfile.trainingFrequency,
      training_since: inputs.userProfile.trainingSince,
      height_cm: inputs.userProfile.heightCm,
      weight_kg: inputs.userProfile.weightKg,
      preferred_unit: inputs.userProfile.preferredUnit,
    },
    morphology: {
      strong_points: inputs.userProfile.strongPoints ?? [],
      weak_points: inputs.userProfile.weakPoints ?? [],
      injury_history: inputs.userProfile.injuryHistory ?? [],
    },
    exercise_preferences: {
      preferred: inputs.userProfile.preferredExercises ?? [],
      avoided: inputs.userProfile.avoidedExercises ?? [],
      constraints: inputs.userProfile.constraints ?? [],
    },
    performance_baselines: buildPerformanceBaselines(
      inputs.exerciseBaselines,
      inputs.recentSetLogs
    ),
    current_block: inputs.currentBlock
      ? buildCurrentBlock(inputs.currentBlock)
      : undefined,
    readiness_trends:
      inputs.recoveryLogs.length > 0
        ? buildReadinessTrends(inputs.recoveryLogs)
        : undefined,
    recent_highlights: buildRecentHighlights(
      inputs.exerciseBaselines,
      inputs.recentSetLogs,
      inputs.recoveryLogs
    ),
    coaching_style: inputs.userProfile.coachingStyle ?? 'direct',
    parallel_sports: inputs.userProfile.parallelSports ?? [],
  };
}

function buildPerformanceBaselines(
  baselines: ExerciseBaselineSnapshot[],
  recentSetLogs: SetLogSnapshot[]
): Record<string, AIContextProfilePerformanceBaseline> {
  const result: Record<string, AIContextProfilePerformanceBaseline> = {};

  for (const baseline of baselines) {
    const trend = computeE1rmTrend(baseline.exerciseId, recentSetLogs);
    const last4wAvg = computeLast4wAvgE1rm(baseline.exerciseId, recentSetLogs);

    result[baseline.exerciseName] = {
      e1rm: Math.round(baseline.bestE1rm * 10) / 10,
      trend,
      last_4w_avg:
        last4wAvg !== null
          ? Math.round(last4wAvg * 10) / 10
          : Math.round(baseline.recentAvgLoad * 10) / 10,
    };
  }

  return result;
}

function computeE1rmTrend(
  exerciseId: string,
  setLogs: SetLogSnapshot[]
): 'up' | 'down' | 'plateau' | 'stable' {
  const logs = setLogs
    .filter((s) => s.exerciseId === exerciseId && s.load && s.reps)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

  if (logs.length < 2) return 'stable';

  const sessions = groupBySession(logs);
  if (sessions.length < 2) return 'stable';

  const sessionE1rms = sessions.map((group) =>
    Math.max(
      ...group.map((s) => computeE1rm(s.load!, s.reps!))
    )
  );

  const last = sessionE1rms[sessionE1rms.length - 1];
  const prev = sessionE1rms[sessionE1rms.length - 2];

  if (Math.abs(last - prev) / prev < 0.02) return 'plateau';
  return last > prev ? 'up' : 'down';
}

function computeLast4wAvgE1rm(
  exerciseId: string,
  setLogs: SetLogSnapshot[]
): number | null {
  const cutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();
  const recent = setLogs.filter(
    (s) =>
      s.exerciseId === exerciseId &&
      s.load &&
      s.reps &&
      s.sessionDate >= cutoff
  );

  if (recent.length === 0) return null;

  const e1rms = recent.map((s) => computeE1rm(s.load!, s.reps!));
  return e1rms.reduce((a, b) => a + b, 0) / e1rms.length;
}

function groupBySession(
  logs: SetLogSnapshot[]
): SetLogSnapshot[][] {
  const map = new Map<string, SetLogSnapshot[]>();
  for (const log of logs) {
    const existing = map.get(log.sessionDate) ?? [];
    existing.push(log);
    map.set(log.sessionDate, existing);
  }
  return Array.from(map.values());
}

function buildCurrentBlock(
  block: CurrentBlockSnapshot
): AIContextProfileCurrentBlock {
  const complianceRate =
    block.totalSessions > 0
      ? Math.round((block.completedSessions / block.totalSessions) * 100) / 100
      : 1;

  return {
    title: block.title,
    goal: block.goal,
    week: block.weekNumber,
    total_weeks: block.durationWeeks,
    compliance_rate: complianceRate,
  };
}

function buildReadinessTrends(
  recoveryLogs: RecoveryLogSnapshot[]
): AIContextProfileReadinessTrends {
  const last7 = recoveryLogs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7);

  const avgSleep = avg(last7.map((r) => r.sleepHours));
  const avgEnergy = avg(last7.map((r) => r.energy));
  const avgSoreness = avg(last7.map((r) => r.soreness));

  const fatigueTrend = computeFatigueTrend(recoveryLogs);

  return {
    avg_sleep: Math.round((avgSleep ?? 0) * 10) / 10,
    avg_energy: Math.round((avgEnergy ?? 0) * 10) / 10,
    avg_soreness: Math.round((avgSoreness ?? 0) * 10) / 10,
    fatigue_trend: fatigueTrend,
  };
}

function computeFatigueTrend(
  logs: RecoveryLogSnapshot[]
): 'improving' | 'stable' | 'worsening' {
  if (logs.length < 4) return 'stable';

  const sorted = logs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const recent = sorted.slice(0, 3);
  const older = sorted.slice(3, 6);

  const recentAvgEnergy = avg(recent.map((r) => r.energy));
  const olderAvgEnergy = avg(older.map((r) => r.energy));

  if (recentAvgEnergy === null || olderAvgEnergy === null) return 'stable';

  const diff = recentAvgEnergy - olderAvgEnergy;
  if (diff > 0.5) return 'improving';
  if (diff < -0.5) return 'worsening';
  return 'stable';
}

function buildRecentHighlights(
  baselines: ExerciseBaselineSnapshot[],
  setLogs: SetLogSnapshot[],
  recoveryLogs: RecoveryLogSnapshot[]
): string[] {
  const highlights: string[] = [];

  for (const baseline of baselines) {
    const trend = computeE1rmTrend(baseline.exerciseId, setLogs);
    if (trend === 'up') {
      highlights.push(`PR ${baseline.exerciseName} e1RM ${Math.round(baseline.bestE1rm)}kg`);
    }
    if (trend === 'plateau') {
      const plateauCount = countPlateau(baseline.exerciseId, setLogs);
      if (plateauCount >= PLATEAU_MIN_SESSIONS) {
        highlights.push(
          `${baseline.exerciseName} stagnant depuis ${plateauCount} séances`
        );
      }
    }
  }

  if (hasSleepDegradation(recoveryLogs)) {
    highlights.push(`sommeil dégradé (< ${SLEEP_DEGRADATION_THRESHOLD_HOURS}h sur ${SLEEP_DEGRADATION_STREAK} jours)`);
  }

  return highlights.slice(0, 5);
}

function countPlateau(exerciseId: string, setLogs: SetLogSnapshot[]): number {
  const sessions = groupBySession(
    setLogs
      .filter((s) => s.exerciseId === exerciseId && s.load && s.reps)
      .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate))
  );

  if (sessions.length < PLATEAU_MIN_SESSIONS) return 0;

  let plateauCount = 1;
  const sessionE1rms = sessions.map((group) =>
    Math.max(...group.map((s) => computeE1rm(s.load!, s.reps!)))
  );

  for (let i = sessionE1rms.length - 1; i > 0; i--) {
    const ratio = Math.abs(sessionE1rms[i] - sessionE1rms[i - 1]) / sessionE1rms[i - 1];
    if (ratio < 0.02) {
      plateauCount++;
    } else {
      break;
    }
  }

  return plateauCount >= PLATEAU_MIN_SESSIONS ? plateauCount : 0;
}

function hasSleepDegradation(recoveryLogs: RecoveryLogSnapshot[]): boolean {
  const sorted = recoveryLogs
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, SLEEP_DEGRADATION_STREAK);

  if (sorted.length < SLEEP_DEGRADATION_STREAK) return false;

  return sorted.every(
    (r) =>
      r.sleepHours !== null &&
      r.sleepHours < SLEEP_DEGRADATION_THRESHOLD_HOURS
  );
}

function avg(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}
