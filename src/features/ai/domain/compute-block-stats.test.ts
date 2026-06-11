/**
 * Tests TA-144 — computeBlockStats (stats du bloc précédent pour le prompt).
 */

import { computeBlockStats, type BlockStatsSetLog } from './compute-block-stats';

function log(
  exerciseId: string,
  sessionDate: string,
  load: number,
  reps: number,
  completed = true
): BlockStatsSetLog {
  return { exerciseId, exerciseName: exerciseId, sessionDate, load, reps, completed };
}

describe('computeBlockStats', () => {
  it('calcule compliance globale, par exercice et tendance e1RM up', () => {
    const stats = computeBlockStats({
      daysPerWeek: 4,
      completedSessions: 17,
      totalSessions: 20,
      setLogs: [
        log('bench', '2026-04-01', 80, 8),
        log('bench', '2026-04-08', 82.5, 8),
        log('bench', '2026-04-15', 85, 8),
        log('bench', '2026-04-22', 87.5, 8),
      ],
      avgFatigueScore: 5.5,
    });

    expect(stats.complianceRate).toBe(0.85);
    expect(stats.daysPerWeek).toBe(4);
    expect(stats.avgFatigueScore).toBe(5.5);
    expect(stats.exerciseProgress).toHaveLength(1);
    expect(stats.exerciseProgress[0]).toMatchObject({
      exerciseId: 'bench',
      e1rmTrend: 'up',
      complianceRate: 1,
    });
  });

  it('détecte un plateau (≥ 4 séances, e1RM plat)', () => {
    const stats = computeBlockStats({
      daysPerWeek: 3,
      completedSessions: 10,
      totalSessions: 10,
      setLogs: [
        log('squat', '2026-04-01', 100, 5),
        log('squat', '2026-04-08', 100, 5),
        log('squat', '2026-04-15', 100, 5),
        log('squat', '2026-04-22', 100, 5),
      ],
    });

    expect(stats.exerciseProgress[0].e1rmTrend).toBe('plateau');
  });

  it('détecte une tendance down et une compliance partielle', () => {
    const stats = computeBlockStats({
      daysPerWeek: 3,
      completedSessions: 8,
      totalSessions: 10,
      setLogs: [
        log('ohp', '2026-04-01', 60, 8),
        log('ohp', '2026-04-08', 57.5, 8),
        log('ohp', '2026-04-15', 55, 8),
        log('ohp', '2026-04-22', 50, 8, false),
      ],
    });

    expect(stats.exerciseProgress[0].e1rmTrend).toBe('down');
    expect(stats.exerciseProgress[0].complianceRate).toBe(0.75);
  });

  it('liste les PR (top 3 e1RM, formatés pour le prompt)', () => {
    const stats = computeBlockStats({
      daysPerWeek: 3,
      completedSessions: 5,
      totalSessions: 5,
      setLogs: [
        log('squat', '2026-04-01', 140, 5),
        log('bench', '2026-04-01', 100, 5),
        log('curl', '2026-04-01', 20, 12),
        log('ohp', '2026-04-01', 60, 8),
      ],
    });

    expect(stats.prs).toHaveLength(3);
    expect(stats.prs[0]).toContain('squat');
    expect(stats.prs[0]).toContain('e1RM');
  });

  it('gère un bloc vide sans crash', () => {
    const stats = computeBlockStats({
      daysPerWeek: 3,
      completedSessions: 0,
      totalSessions: 0,
      setLogs: [],
    });

    expect(stats.complianceRate).toBe(0);
    expect(stats.exerciseProgress).toEqual([]);
    expect(stats.prs).toEqual([]);
    expect(stats.avgFatigueScore).toBeNull();
  });
});
