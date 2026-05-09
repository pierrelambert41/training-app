import { computeStats } from './compute-stats';
import type { ParsedHevyData } from '../types/hevy-csv-types';
import type { ExerciseMatch } from '../types/import-state';

function makeSession(date: string, exerciseName: string, setCount: number) {
  return {
    date,
    exerciseName,
    sets: Array.from({ length: setCount }, (_, i) => ({
      setOrder: i + 1,
      weightKg: 100,
      reps: 8,
      rpe: null,
      notes: null,
    })),
  };
}

function makeMapping(hevyName: string, ignored = false): ExerciseMatch {
  return {
    hevyName,
    internalId: ignored ? null : 'some-id',
    internalName: ignored ? null : hevyName,
    score: ignored ? 0 : 1,
    ignored,
  };
}

function makeData(sessions: ReturnType<typeof makeSession>[]): ParsedHevyData {
  return { sessions, warnings: [], errors: [] };
}

describe('computeStats', () => {
  it('counts unique dates as sessionCount', () => {
    const data = makeData([
      makeSession('2024-01-15', 'Bench Press', 3),
      makeSession('2024-01-15', 'Squat', 2),
      makeSession('2024-01-16', 'Bench Press', 3),
    ]);
    const mappings = [makeMapping('Bench Press'), makeMapping('Squat')];
    const stats = computeStats(data, mappings);

    expect(stats.sessionCount).toBe(2);
  });

  it('counts unique exercise names as exerciseCount', () => {
    const data = makeData([
      makeSession('2024-01-15', 'Bench Press', 3),
      makeSession('2024-01-15', 'Squat', 2),
      makeSession('2024-01-16', 'Bench Press', 3),
    ]);
    const mappings = [makeMapping('Bench Press'), makeMapping('Squat')];
    const stats = computeStats(data, mappings);

    expect(stats.exerciseCount).toBe(2);
  });

  it('sums all sets across active sessions', () => {
    const data = makeData([
      makeSession('2024-01-15', 'Bench Press', 3),
      makeSession('2024-01-15', 'Squat', 2),
    ]);
    const mappings = [makeMapping('Bench Press'), makeMapping('Squat')];
    const stats = computeStats(data, mappings);

    expect(stats.setCount).toBe(5);
  });

  it('excludes ignored exercises from counts', () => {
    const data = makeData([
      makeSession('2024-01-15', 'Bench Press', 3),
      makeSession('2024-01-15', 'Squat', 2),
    ]);
    const mappings = [makeMapping('Bench Press'), makeMapping('Squat', true)];
    const stats = computeStats(data, mappings);

    expect(stats.sessionCount).toBe(1);
    expect(stats.exerciseCount).toBe(1);
    expect(stats.setCount).toBe(3);
    expect(stats.ignoredCount).toBe(1);
  });

  it('returns ignoredCount = 0 when nothing is ignored', () => {
    const data = makeData([makeSession('2024-01-15', 'Bench Press', 3)]);
    const mappings = [makeMapping('Bench Press')];
    const stats = computeStats(data, mappings);

    expect(stats.ignoredCount).toBe(0);
  });

  it('returns all zeros for empty sessions', () => {
    const data = makeData([]);
    const stats = computeStats(data, []);

    expect(stats.sessionCount).toBe(0);
    expect(stats.exerciseCount).toBe(0);
    expect(stats.setCount).toBe(0);
    expect(stats.ignoredCount).toBe(0);
  });

  it('counts ignored exercises even when all are ignored', () => {
    const data = makeData([
      makeSession('2024-01-15', 'Bench Press', 3),
      makeSession('2024-01-15', 'Squat', 2),
    ]);
    const mappings = [makeMapping('Bench Press', true), makeMapping('Squat', true)];
    const stats = computeStats(data, mappings);

    expect(stats.sessionCount).toBe(0);
    expect(stats.exerciseCount).toBe(0);
    expect(stats.setCount).toBe(0);
    expect(stats.ignoredCount).toBe(2);
  });
});
