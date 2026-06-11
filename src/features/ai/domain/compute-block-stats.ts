import { computeE1rm } from '@/lib/epley';
import type { BlockExerciseProgress, BlockStats } from '../types/ai-generation';

/** Snapshot d'un SetLog du bloc — chargé par le service appelant (pas d'I/O ici). */
export type BlockStatsSetLog = {
  exerciseId: string;
  exerciseName: string;
  sessionDate: string;
  load: number | null;
  reps: number | null;
  completed: boolean;
};

export type ComputeBlockStatsInput = {
  daysPerWeek: number;
  completedSessions: number;
  totalSessions: number;
  setLogs: BlockStatsSetLog[];
  avgFatigueScore?: number | null;
};

const TREND_THRESHOLD = 0.025; // ±2.5% entre première et seconde moitié du bloc
const MIN_SESSIONS_FOR_PLATEAU = 4;
const MAX_PRS = 3;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeTrend(e1rmsByDate: Array<{ date: string; e1rm: number }>): BlockExerciseProgress['e1rmTrend'] {
  if (e1rmsByDate.length < 2) return 'stable';

  const sorted = [...e1rmsByDate].sort((a, b) => a.date.localeCompare(b.date));
  const mid = Math.floor(sorted.length / 2);
  const avg = (arr: typeof sorted) => arr.reduce((s, x) => s + x.e1rm, 0) / arr.length;
  const firstHalf = avg(sorted.slice(0, mid));
  const secondHalf = avg(sorted.slice(mid));

  if (firstHalf <= 0) return 'stable';
  const delta = (secondHalf - firstHalf) / firstHalf;

  if (delta > TREND_THRESHOLD) return 'up';
  if (delta < -TREND_THRESHOLD) return 'down';
  return sorted.length >= MIN_SESSIONS_FOR_PLATEAU ? 'plateau' : 'stable';
}

/**
 * Calcule les BlockStats du bloc précédent pour le prompt regenerateBlock
 * (TA-144) : compliance globale et par exercice, tendance e1RM
 * (première vs seconde moitié du bloc, seuil ±2.5%), PR réalisés.
 *
 * Pure — les SetLogs sont chargés par le service appelant.
 */
export function computeBlockStats(input: ComputeBlockStatsInput): BlockStats {
  type ExerciseAcc = {
    name: string;
    total: number;
    completed: number;
    e1rmBySession: Map<string, number>;
  };
  const byExercise = new Map<string, ExerciseAcc>();

  for (const log of input.setLogs) {
    const acc = byExercise.get(log.exerciseId) ?? {
      name: log.exerciseName,
      total: 0,
      completed: 0,
      e1rmBySession: new Map<string, number>(),
    };
    acc.total += 1;
    if (log.completed) acc.completed += 1;

    if (log.completed && log.load !== null && log.reps !== null && log.reps > 0) {
      const e1rm = computeE1rm(log.load, log.reps);
      const best = acc.e1rmBySession.get(log.sessionDate) ?? 0;
      if (e1rm > best) acc.e1rmBySession.set(log.sessionDate, e1rm);
    }

    byExercise.set(log.exerciseId, acc);
  }

  const exerciseProgress: BlockExerciseProgress[] = Array.from(byExercise.entries()).map(
    ([exerciseId, acc]) => ({
      exerciseId,
      exerciseName: acc.name,
      e1rmTrend: computeTrend(
        Array.from(acc.e1rmBySession.entries()).map(([date, e1rm]) => ({ date, e1rm }))
      ),
      complianceRate: acc.total > 0 ? round2(acc.completed / acc.total) : 0,
    })
  );

  const prs = Array.from(byExercise.values())
    .map((acc) => ({
      name: acc.name,
      best: Math.max(0, ...acc.e1rmBySession.values()),
    }))
    .filter((x) => x.best > 0)
    .sort((a, b) => b.best - a.best)
    .slice(0, MAX_PRS)
    .map((x) => `${x.name} : e1RM ${Math.round(x.best * 10) / 10}kg`);

  return {
    complianceRate:
      input.totalSessions > 0 ? round2(input.completedSessions / input.totalSessions) : 0,
    daysPerWeek: input.daysPerWeek,
    exerciseProgress,
    avgFatigueScore: input.avgFatigueScore ?? null,
    prs,
  };
}
