import {
  computeWeekProgress,
  mondayOf,
  weekStartFor,
} from './week-progress';
import type { WorkoutDay } from '@/types/workout-day';

function day(id: string, dayOrder: number): WorkoutDay {
  return {
    id,
    blockId: 'b1',
    title: `Day ${id}`,
    dayOrder,
    splitType: null,
    estimatedDurationMin: null,
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

describe('mondayOf', () => {
  it('retourne le lundi de la semaine (jeudi et dimanche inclus)', () => {
    expect(mondayOf('2026-06-11')).toBe('2026-06-08'); // jeudi
    expect(mondayOf('2026-06-14')).toBe('2026-06-08'); // dimanche
    expect(mondayOf('2026-06-08')).toBe('2026-06-08'); // lundi
  });
});

describe('weekStartFor', () => {
  it('décale par semaines depuis le lundi du bloc', () => {
    expect(weekStartFor('2026-06-03', 1, '2026-06-11')).toBe('2026-06-01');
    expect(weekStartFor('2026-06-03', 3, '2026-06-11')).toBe('2026-06-15');
  });

  it('retombe sur la semaine courante sans startDate', () => {
    expect(weekStartFor(null, 5, '2026-06-11')).toBe('2026-06-08');
  });
});

describe('computeWeekProgress', () => {
  const DAYS = [day('wd1', 1), day('wd2', 3), day('wd4', 5)]; // lun, mer, ven

  it('attribue done / today / missed / upcoming par jour', () => {
    const progress = computeWeekProgress(
      DAYS,
      [{ workoutDayId: 'wd1', date: '2026-06-08' }],
      '2026-06-08',
      '2026-06-10' // mercredi
    );
    expect(progress.stateByDayId).toEqual({
      wd1: 'done',
      wd2: 'today',
      wd4: 'upcoming',
    });
    expect(progress.doneCount).toBe(1);
    expect(progress.plannedCount).toBe(3);
  });

  it('marque missed un jour passé sans séance', () => {
    const progress = computeWeekProgress(DAYS, [], '2026-06-08', '2026-06-11');
    expect(progress.stateByDayId.wd1).toBe('missed');
    expect(progress.stateByDayId.wd2).toBe('missed');
    expect(progress.stateByDayId.wd4).toBe('upcoming');
  });

  it('compte done une séance décalée dans la semaine (autre jour que planifié)', () => {
    const progress = computeWeekProgress(
      DAYS,
      [{ workoutDayId: 'wd2', date: '2026-06-13' }], // mercredi fait le samedi
      '2026-06-08',
      '2026-06-14'
    );
    expect(progress.stateByDayId.wd2).toBe('done');
  });

  it('ignore les séances hors semaine ou sans workout_day', () => {
    const progress = computeWeekProgress(
      DAYS,
      [
        { workoutDayId: 'wd1', date: '2026-06-07' }, // semaine précédente
        { workoutDayId: null, date: '2026-06-09' }, // séance libre
      ],
      '2026-06-08',
      '2026-06-09'
    );
    expect(progress.doneCount).toBe(0);
  });

  it('décale les day_order 0-indexés comme WeekCalendar', () => {
    const progress = computeWeekProgress(
      [day('wd0', 0)], // 0-indexé → lundi
      [],
      '2026-06-08',
      '2026-06-08'
    );
    expect(progress.stateByDayId.wd0).toBe('today');
  });
});
