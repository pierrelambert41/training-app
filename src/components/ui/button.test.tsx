import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from './button';

describe('Button', () => {
  it('renders the label', () => {
    const { getByText } = render(<Button label="Valider" onPress={() => {}} />);
    expect(getByText('Valider')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Tap" onPress={onPress} />);
    fireEvent.press(getByText('Tap'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Tap" onPress={onPress} disabled />);
    fireEvent.press(getByText('Tap'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('shows ActivityIndicator when loading', () => {
    const { queryByText, UNSAFE_getByType } = render(
      <Button label="Tap" onPress={() => {}} loading />
    );
    expect(queryByText('Tap')).toBeNull();
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('renders all variants without error', () => {
    const variants = ['primary', 'secondary', 'ghost'] as const;
    variants.forEach((variant) => {
      const { getByText } = render(<Button label="X" onPress={() => {}} variant={variant} />);
      expect(getByText('X')).toBeTruthy();
    });
  });

  it('renders all sizes without error', () => {
    const sizes = ['md', 'lg'] as const;
    sizes.forEach((size) => {
      const { getByText } = render(<Button label="X" onPress={() => {}} size={size} />);
      expect(getByText('X')).toBeTruthy();
    });
  });
});
