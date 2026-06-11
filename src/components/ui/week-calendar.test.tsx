import React from 'react';
import { render } from '@testing-library/react-native';
import { WeekCalendar } from './week-calendar';
import type { WorkoutDay } from '@/types/workout-day';

function day(id: string, dayOrder: number): WorkoutDay {
  return {
    id,
    blockId: 'b1',
    title: `Day ${id}`,
    dayOrder,
    splitType: 'push',
    estimatedDurationMin: 60,
    createdAt: '2026-06-01T00:00:00.000Z',
  };
}

const BASE_PROPS = {
  startDate: '2026-06-01',
  weekNumber: 1,
  durationWeeks: 4,
  workoutDays: [day('wd1', 1), day('wd2', 3)],
  onDayPress: jest.fn(),
  onPrevWeek: jest.fn(),
  onNextWeek: jest.fn(),
};

describe('WeekCalendar — états des jours (TA-155)', () => {
  it('affiche ✓ pour un jour fait et ✗ pour un jour manqué', () => {
    const { getAllByTestId } = render(
      <WeekCalendar
        {...BASE_PROPS}
        dayStates={{ wd1: 'done', wd2: 'missed' }}
      />
    );
    expect(getAllByTestId('day-state-done')).toHaveLength(1);
    expect(getAllByTestId('day-state-missed')).toHaveLength(1);
  });

  it("n'affiche aucun badge sans dayStates (rétro-compatible)", () => {
    const { queryAllByTestId } = render(<WeekCalendar {...BASE_PROPS} />);
    expect(queryAllByTestId('day-state-done')).toHaveLength(0);
    expect(queryAllByTestId('day-state-missed')).toHaveLength(0);
  });

  it("ne marque pas les jours à venir (badge neutre)", () => {
    const { getAllByTestId, queryAllByTestId } = render(
      <WeekCalendar
        {...BASE_PROPS}
        dayStates={{ wd1: 'upcoming', wd2: 'today' }}
      />
    );
    expect(getAllByTestId('day-state-none')).toHaveLength(2);
    expect(queryAllByTestId('day-state-done')).toHaveLength(0);
  });
});
