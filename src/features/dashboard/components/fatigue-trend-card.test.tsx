import React from 'react';
import { render } from '@testing-library/react-native';
import { FatigueTrendCard } from './fatigue-trend-card';

const POINTS = [
  { date: '2026-05-20', score: 3 },
  { date: '2026-06-02', score: 5.5 },
];

describe('FatigueTrendCard', () => {
  it('affiche le dernier score et son palier', () => {
    const { getByTestId } = render(<FatigueTrendCard points={POINTS} />);
    expect(getByTestId('fatigue-last-score').props.children.join('')).toBe('5.5/10');
    expect(getByTestId('fatigue-level').props.children).toBe('Vigilance');
    expect(getByTestId('fatigue-chart')).toBeTruthy();
  });

  it("affiche l'état vide sans historique de fatigue", () => {
    const { getByTestId, queryByTestId } = render(<FatigueTrendCard points={[]} />);
    expect(getByTestId('fatigue-chart-empty')).toBeTruthy();
    expect(queryByTestId('fatigue-last-score')).toBeNull();
  });
});
