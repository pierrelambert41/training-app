import React from 'react';
import { render } from '@testing-library/react-native';
import { ThemedCard } from './themed-card';

describe('ThemedCard', () => {
  it('renders title and value', () => {
    const { getByText } = render(<ThemedCard title="Charge" value="100" />);
    expect(getByText('Charge')).toBeTruthy();
    expect(getByText('100')).toBeTruthy();
  });

  it('renders unit when provided', () => {
    const { getByText } = render(<ThemedCard title="Charge" value="100" unit="kg" />);
    expect(getByText('kg')).toBeTruthy();
  });

  it('renders all four statuses without error', () => {
    const statuses = ['default', 'success', 'warning', 'danger'] as const;
    statuses.forEach((status) => {
      const { getByText } = render(<ThemedCard title="Test" value="X" status={status} />);
      expect(getByText('Test')).toBeTruthy();
    });
  });
});
