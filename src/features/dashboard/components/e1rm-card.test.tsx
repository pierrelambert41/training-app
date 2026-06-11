import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { E1rmCard } from './e1rm-card';

const EXERCISES = [
  { id: 'ex1', name: 'Développé couché', sessionCount: 8 },
  { id: 'ex2', name: 'Squat', sessionCount: 5 },
];

const POINTS = [
  { date: '2026-05-01', e1rm: 110 },
  { date: '2026-06-01', e1rm: 115.5 },
];

describe('E1rmCard', () => {
  it("affiche l'état vide sans exercice loggé", () => {
    const { getByTestId } = render(
      <E1rmCard
        exercises={[]}
        selectedExerciseId={null}
        onSelectExercise={jest.fn()}
        points={[]}
      />
    );
    expect(getByTestId('e1rm-card-empty')).toBeTruthy();
  });

  it('affiche les chips, la dernière valeur et le delta', () => {
    const { getByTestId, getByText } = render(
      <E1rmCard
        exercises={EXERCISES}
        selectedExerciseId="ex1"
        onSelectExercise={jest.fn()}
        points={POINTS}
      />
    );
    expect(getByText('Développé couché')).toBeTruthy();
    expect(getByText('Squat')).toBeTruthy();
    expect(getByTestId('e1rm-last-value').props.children).toBe('115.5 kg');
    expect(getByTestId('e1rm-delta')).toBeTruthy();
    expect(getByTestId('e1rm-chart')).toBeTruthy();
  });

  it('notifie la sélection d’un autre exercice', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <E1rmCard
        exercises={EXERCISES}
        selectedExerciseId="ex1"
        onSelectExercise={onSelect}
        points={POINTS}
      />
    );
    fireEvent.press(getByTestId('e1rm-exercise-chip-ex2'));
    expect(onSelect).toHaveBeenCalledWith('ex2');
  });

  it("délègue l'état < 2 points au LineChart", () => {
    const { getByTestId } = render(
      <E1rmCard
        exercises={EXERCISES}
        selectedExerciseId="ex1"
        onSelectExercise={jest.fn()}
        points={[{ date: '2026-06-01', e1rm: 110 }]}
      />
    );
    expect(getByTestId('e1rm-chart-empty')).toBeTruthy();
  });
});
