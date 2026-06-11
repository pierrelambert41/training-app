import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { VolumeCard } from './volume-card';

const VOLUMES = [
  { muscle: 'chest', sets: 12 },
  { muscle: 'quads', sets: 9 },
];

describe('VolumeCard', () => {
  it('affiche le label de semaine et les barres avec labels FR', () => {
    const { getByTestId, getByText } = render(
      <VolumeCard
        volumes={VOLUMES}
        weekStart="2026-06-08"
        weekOffset={0}
        onPreviousWeek={jest.fn()}
        onNextWeek={jest.fn()}
      />
    );
    expect(getByTestId('volume-week-label').props.children.join('')).toBe(
      'Semaine du 08/06 (en cours)'
    );
    expect(getByText('Pectoraux')).toBeTruthy();
    expect(getByText('Quadriceps')).toBeTruthy();
    expect(getByText('12')).toBeTruthy();
  });

  it('navigue vers la semaine précédente, semaine suivante désactivée sur la courante', () => {
    const onPrev = jest.fn();
    const onNext = jest.fn();
    const { getByTestId } = render(
      <VolumeCard
        volumes={VOLUMES}
        weekStart="2026-06-08"
        weekOffset={0}
        onPreviousWeek={onPrev}
        onNextWeek={onNext}
      />
    );
    fireEvent.press(getByTestId('volume-prev-week'));
    expect(onPrev).toHaveBeenCalled();
    fireEvent.press(getByTestId('volume-next-week'));
    expect(onNext).not.toHaveBeenCalled();
  });

  it('réactive la semaine suivante sur une semaine passée', () => {
    const onNext = jest.fn();
    const { getByTestId } = render(
      <VolumeCard
        volumes={VOLUMES}
        weekStart="2026-06-01"
        weekOffset={-1}
        onPreviousWeek={jest.fn()}
        onNextWeek={onNext}
      />
    );
    fireEvent.press(getByTestId('volume-next-week'));
    expect(onNext).toHaveBeenCalled();
  });

  it("affiche l'état vide sans séance sur la semaine", () => {
    const { getByTestId } = render(
      <VolumeCard
        volumes={[]}
        weekStart="2026-06-08"
        weekOffset={0}
        onPreviousWeek={jest.fn()}
        onNextWeek={jest.fn()}
      />
    );
    expect(getByTestId('volume-chart-empty')).toBeTruthy();
  });
});
