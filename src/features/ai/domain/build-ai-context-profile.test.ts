import {
  buildAIContextProfile,
  type BuildAIContextProfileInputs,
  type ExerciseBaselineSnapshot,
  type RecoveryLogSnapshot,
  type SetLogSnapshot,
  type UserProfileSnapshot,
} from './build-ai-context-profile';

const BASE_USER: UserProfileSnapshot = {
  level: 'intermediate',
  goals: { primary: 'hypertrophy', secondary: 'strength' },
  trainingFrequency: 4,
  trainingSince: '2022-01',
  heightCm: 180,
  weightKg: 80,
  preferredUnit: 'kg',
  coachingStyle: 'direct',
  parallelSports: [],
};

const BENCH_BASELINE: ExerciseBaselineSnapshot = {
  exerciseId: 'ex-bench',
  exerciseName: 'Bench Press',
  bestE1rm: 110,
  recentAvgLoad: 100,
  calibratedAt: '2026-05-01T00:00:00.000Z',
};

const SQUAT_BASELINE: ExerciseBaselineSnapshot = {
  exerciseId: 'ex-squat',
  exerciseName: 'Squat',
  bestE1rm: 140,
  recentAvgLoad: 130,
  calibratedAt: '2026-05-01T00:00:00.000Z',
};

const makeSetLog = (
  exerciseId: string,
  exerciseName: string,
  load: number,
  reps: number,
  sessionDate: string
): SetLogSnapshot => ({ exerciseId, exerciseName, load, reps, sessionDate });

const makeRecoveryLog = (
  date: string,
  sleepHours: number | null,
  energy: number | null,
  soreness: number | null
): RecoveryLogSnapshot => ({ date, sleepHours, energy, soreness });

describe('buildAIContextProfile', () => {
  describe('version', () => {
    it('increments version from 0 when no previous version', () => {
      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [],
        recentSetLogs: [],
        recoveryLogs: [],
      };
      const profile = buildAIContextProfile(inputs);
      expect(profile.version).toBe(1);
    });

    it('increments version from previousVersion', () => {
      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [],
        recentSetLogs: [],
        recoveryLogs: [],
        previousVersion: 5,
      };
      const profile = buildAIContextProfile(inputs);
      expect(profile.version).toBe(6);
    });
  });

  describe('user block', () => {
    it('maps user profile fields correctly', () => {
      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [],
        recentSetLogs: [],
        recoveryLogs: [],
      };
      const { user } = buildAIContextProfile(inputs);

      expect(user.level).toBe('intermediate');
      expect(user.goals).toEqual({ primary: 'hypertrophy', secondary: 'strength' });
      expect(user.training_frequency).toBe(4);
      expect(user.height_cm).toBe(180);
      expect(user.weight_kg).toBe(80);
      expect(user.preferred_unit).toBe('kg');
    });
  });

  describe('performance_baselines', () => {
    it('maps baselines with e1rm and last_4w_avg', () => {
      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [BENCH_BASELINE],
        recentSetLogs: [],
        recoveryLogs: [],
      };

      const { performance_baselines } = buildAIContextProfile(inputs);
      expect(performance_baselines['Bench Press']).toBeDefined();
      expect(performance_baselines['Bench Press'].e1rm).toBe(110);
      expect(performance_baselines['Bench Press'].last_4w_avg).toBeGreaterThan(0);
    });

    it('returns trend "up" when recent sets show improvement', () => {
      const recentSetLogs: SetLogSnapshot[] = [
        makeSetLog('ex-bench', 'Bench Press', 90, 5, '2026-04-10'),
        makeSetLog('ex-bench', 'Bench Press', 95, 5, '2026-04-17'),
        makeSetLog('ex-bench', 'Bench Press', 100, 5, '2026-04-24'),
      ];

      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [BENCH_BASELINE],
        recentSetLogs,
        recoveryLogs: [],
      };

      const { performance_baselines } = buildAIContextProfile(inputs);
      expect(performance_baselines['Bench Press'].trend).toBe('up');
    });

    it('returns trend "plateau" when last two sessions are identical', () => {
      const recentSetLogs: SetLogSnapshot[] = [
        makeSetLog('ex-bench', 'Bench Press', 90, 5, '2026-04-10'),
        makeSetLog('ex-bench', 'Bench Press', 90, 5, '2026-04-17'),
        makeSetLog('ex-bench', 'Bench Press', 90, 5, '2026-04-24'),
      ];

      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [BENCH_BASELINE],
        recentSetLogs,
        recoveryLogs: [],
      };

      const { performance_baselines } = buildAIContextProfile(inputs);
      expect(performance_baselines['Bench Press'].trend).toBe('plateau');
    });

    it('returns trend "down" when last session is lower', () => {
      const recentSetLogs: SetLogSnapshot[] = [
        makeSetLog('ex-bench', 'Bench Press', 100, 5, '2026-04-10'),
        makeSetLog('ex-bench', 'Bench Press', 85, 5, '2026-04-24'),
      ];

      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [BENCH_BASELINE],
        recentSetLogs,
        recoveryLogs: [],
      };

      const { performance_baselines } = buildAIContextProfile(inputs);
      expect(performance_baselines['Bench Press'].trend).toBe('down');
    });

    it('returns multiple baselines for multiple exercises', () => {
      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [BENCH_BASELINE, SQUAT_BASELINE],
        recentSetLogs: [],
        recoveryLogs: [],
      };

      const { performance_baselines } = buildAIContextProfile(inputs);
      expect(Object.keys(performance_baselines)).toHaveLength(2);
      expect(performance_baselines['Squat'].e1rm).toBe(140);
    });
  });

  describe('current_block', () => {
    it('is undefined when no block provided', () => {
      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [],
        recentSetLogs: [],
        recoveryLogs: [],
      };
      expect(buildAIContextProfile(inputs).current_block).toBeUndefined();
    });

    it('computes compliance_rate from session counts', () => {
      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [],
        recentSetLogs: [],
        recoveryLogs: [],
        currentBlock: {
          title: 'Hypertrophie S3/6',
          goal: 'hypertrophy',
          weekNumber: 3,
          durationWeeks: 6,
          totalSessions: 10,
          completedSessions: 9,
        },
      };

      const { current_block } = buildAIContextProfile(inputs);
      expect(current_block?.compliance_rate).toBe(0.9);
      expect(current_block?.week).toBe(3);
      expect(current_block?.total_weeks).toBe(6);
    });
  });

  describe('readiness_trends', () => {
    it('is undefined when no recovery logs', () => {
      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [],
        recentSetLogs: [],
        recoveryLogs: [],
      };
      expect(buildAIContextProfile(inputs).readiness_trends).toBeUndefined();
    });

    it('computes average sleep, energy, soreness', () => {
      const recoveryLogs: RecoveryLogSnapshot[] = [
        makeRecoveryLog('2026-05-15', 7, 7, 3),
        makeRecoveryLog('2026-05-16', 8, 8, 2),
        makeRecoveryLog('2026-05-17', 6, 6, 4),
      ];

      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [],
        recentSetLogs: [],
        recoveryLogs,
      };

      const { readiness_trends } = buildAIContextProfile(inputs);
      expect(readiness_trends?.avg_sleep).toBeCloseTo(7.0, 1);
      expect(readiness_trends?.avg_energy).toBeCloseTo(7.0, 1);
      expect(readiness_trends?.avg_soreness).toBeCloseTo(3.0, 1);
    });

    it('detects worsening fatigue trend', () => {
      const recoveryLogs: RecoveryLogSnapshot[] = [
        makeRecoveryLog('2026-05-10', 8, 8, 2),
        makeRecoveryLog('2026-05-11', 8, 8, 2),
        makeRecoveryLog('2026-05-12', 8, 8, 2),
        makeRecoveryLog('2026-05-15', 6, 4, 6),
        makeRecoveryLog('2026-05-16', 5, 3, 7),
        makeRecoveryLog('2026-05-17', 5, 3, 8),
      ];

      const { readiness_trends } = buildAIContextProfile({
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [],
        recentSetLogs: [],
        recoveryLogs,
      });

      expect(readiness_trends?.fatigue_trend).toBe('worsening');
    });
  });

  describe('recent_highlights', () => {
    it('detects PR highlight when trend is up', () => {
      const recentSetLogs: SetLogSnapshot[] = [
        makeSetLog('ex-bench', 'Bench Press', 90, 5, '2026-04-10'),
        makeSetLog('ex-bench', 'Bench Press', 100, 5, '2026-05-01'),
      ];

      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [BENCH_BASELINE],
        recentSetLogs,
        recoveryLogs: [],
      };

      const { recent_highlights } = buildAIContextProfile(inputs);
      expect(recent_highlights.some((h) => h.includes('PR') && h.includes('Bench'))).toBe(true);
    });

    it('detects plateau highlight after 3+ stagnant sessions', () => {
      const recentSetLogs: SetLogSnapshot[] = [
        makeSetLog('ex-squat', 'Squat', 130, 5, '2026-04-03'),
        makeSetLog('ex-squat', 'Squat', 130, 5, '2026-04-10'),
        makeSetLog('ex-squat', 'Squat', 130, 5, '2026-04-17'),
        makeSetLog('ex-squat', 'Squat', 130, 5, '2026-04-24'),
      ];

      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [SQUAT_BASELINE],
        recentSetLogs,
        recoveryLogs: [],
      };

      const { recent_highlights } = buildAIContextProfile(inputs);
      expect(recent_highlights.some((h) => h.includes('stagnant') && h.includes('Squat'))).toBe(true);
    });

    it('detects sleep degradation when sleep < 6h for 3+ consecutive days', () => {
      const recoveryLogs: RecoveryLogSnapshot[] = [
        makeRecoveryLog('2026-05-15', 5, 5, 3),
        makeRecoveryLog('2026-05-16', 5.5, 5, 3),
        makeRecoveryLog('2026-05-17', 4, 4, 4),
      ];

      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: [],
        recentSetLogs: [],
        recoveryLogs,
      };

      const { recent_highlights } = buildAIContextProfile(inputs);
      expect(recent_highlights.some((h) => h.includes('sommeil'))).toBe(true);
    });

    it('caps highlights at 5 entries', () => {
      const baselines: ExerciseBaselineSnapshot[] = Array.from({ length: 8 }, (_, i) => ({
        exerciseId: `ex-${i}`,
        exerciseName: `Exercise ${i}`,
        bestE1rm: 100,
        recentAvgLoad: 90,
        calibratedAt: '2026-05-01T00:00:00.000Z',
      }));

      const recentSetLogs: SetLogSnapshot[] = baselines.flatMap((b) => [
        makeSetLog(b.exerciseId, b.exerciseName, 90, 5, '2026-04-10'),
        makeSetLog(b.exerciseId, b.exerciseName, 100, 5, '2026-05-01'),
      ]);

      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: BASE_USER,
        exerciseBaselines: baselines,
        recentSetLogs,
        recoveryLogs: [],
      };

      const { recent_highlights } = buildAIContextProfile(inputs);
      expect(recent_highlights.length).toBeLessThanOrEqual(5);
    });
  });

  describe('schema conformance', () => {
    it('produces a profile conforming to ai-strategy.md §3 structure', () => {
      const inputs: BuildAIContextProfileInputs = {
        userId: 'user-1',
        userProfile: {
          ...BASE_USER,
          strongPoints: ['chest'],
          weakPoints: ['hamstrings'],
          injuryHistory: ['lower_back_2023'],
          preferredExercises: ['bench_press'],
          avoidedExercises: ['behind_neck_press'],
        },
        exerciseBaselines: [BENCH_BASELINE],
        recentSetLogs: [makeSetLog('ex-bench', 'Bench Press', 100, 5, '2026-05-10')],
        recoveryLogs: [makeRecoveryLog('2026-05-17', 7, 7, 3)],
        currentBlock: {
          title: 'Hypertrophie S3/6',
          goal: 'hypertrophy',
          weekNumber: 3,
          durationWeeks: 6,
          totalSessions: 12,
          completedSessions: 11,
        },
        previousVersion: 2,
      };

      const profile = buildAIContextProfile(inputs);

      expect(profile.version).toBe(3);
      expect(profile.user).toBeDefined();
      expect(profile.morphology).toBeDefined();
      expect(profile.exercise_preferences).toBeDefined();
      expect(profile.performance_baselines).toBeDefined();
      expect(profile.current_block).toBeDefined();
      expect(profile.readiness_trends).toBeDefined();
      expect(Array.isArray(profile.recent_highlights)).toBe(true);
      expect(profile.coaching_style).toBe('direct');
      expect(Array.isArray(profile.parallel_sports)).toBe(true);

      expect(profile.morphology.strong_points).toEqual(['chest']);
      expect(profile.morphology.injury_history).toEqual(['lower_back_2023']);
      expect(profile.exercise_preferences.avoided).toEqual(['behind_neck_press']);
    });
  });
});
