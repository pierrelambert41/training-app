import React from 'react';
import { render } from '@testing-library/react-native';
import { BarChart } from './bar-chart';

const ITEMS = [
  { label: 'Pectoraux', value: 12 },
  { label: 'Dos', value: 16 },
  { label: 'Quadriceps', value: 8 },
];

describe('BarChart', () => {
  it('affiche une barre par item avec label et valeur', () => {
    const { getByText, getByTestId } = render(<BarChart items={ITEMS} />);
    expect(getByText('Pectoraux')).toBeTruthy();
    expect(getByText('Dos')).toBeTruthy();
    expect(getByText('16')).toBeTruthy();
    expect(getByTestId('bar-chart-bar-Dos')).toBeTruthy();
  });

  it('échelle relative au max : la barre max occupe 100%', () => {
    const { getByTestId } = render(<BarChart items={ITEMS} />);
    expect(getByTestId('bar-chart-bar-Dos').props.style.width).toBe('100%');
    expect(getByTestId('bar-chart-bar-Quadriceps').props.style.width).toBe('50%');
  });

  it('applique formatValue', () => {
    const { getByText } = render(
      <BarChart items={[{ label: 'Dos', value: 16 }]} formatValue={(v) => `${v} séries`} />
    );
    expect(getByText('16 séries')).toBeTruthy();
  });

  it("affiche l'état vide sans items", () => {
    const { getByTestId, queryByTestId } = render(
      <BarChart items={[]} emptyMessage="Aucune séance" />
    );
    expect(getByTestId('bar-chart-empty')).toBeTruthy();
    expect(queryByTestId('bar-chart')).toBeNull();
  });
});
