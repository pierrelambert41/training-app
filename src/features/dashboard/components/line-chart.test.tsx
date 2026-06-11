import React from 'react';
import { render } from '@testing-library/react-native';
import { LineChart } from './line-chart';

const POINTS = [
  { label: '01/06', value: 100 },
  { label: '04/06', value: 105 },
  { label: '08/06', value: 102.5 },
];

describe('LineChart', () => {
  it('affiche min/max et les labels de bornes X', () => {
    const { getByTestId, getByText } = render(<LineChart points={POINTS} />);
    expect(getByTestId('line-chart')).toBeTruthy();
    expect(getByTestId('line-chart-max').props.children).toBe('105');
    expect(getByTestId('line-chart-min').props.children).toBe('100');
    expect(getByText('01/06')).toBeTruthy();
    expect(getByText('08/06')).toBeTruthy();
  });

  it('applique formatValue aux bornes Y', () => {
    const { getByTestId } = render(
      <LineChart points={POINTS} formatValue={(v) => `${v} kg`} />
    );
    expect(getByTestId('line-chart-max').props.children).toBe('105 kg');
  });

  it("affiche l'état vide avec moins de 2 points", () => {
    const { getByTestId, queryByTestId } = render(
      <LineChart points={[{ label: '01/06', value: 100 }]} emptyMessage="Rien à tracer" />
    );
    expect(getByTestId('line-chart-empty')).toBeTruthy();
    expect(queryByTestId('line-chart')).toBeNull();
  });
});
