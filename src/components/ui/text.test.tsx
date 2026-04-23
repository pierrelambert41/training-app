import React from 'react';
import { render } from '@testing-library/react-native';
import { AppText } from './text';

describe('AppText', () => {
  it('renders children', () => {
    const { getByText } = render(<AppText>Bonjour</AppText>);
    expect(getByText('Bonjour')).toBeTruthy();
  });

  it('renders all variants without error', () => {
    const variants = ['heading', 'body', 'caption'] as const;
    variants.forEach((variant) => {
      const { getByText } = render(<AppText variant={variant}>X</AppText>);
      expect(getByText('X')).toBeTruthy();
    });
  });

  it('renders with muted prop', () => {
    const { getByText } = render(<AppText muted>Note</AppText>);
    expect(getByText('Note')).toBeTruthy();
  });

  it('accepts additional className', () => {
    const { getByText } = render(<AppText className="font-bold">Bold</AppText>);
    expect(getByText('Bold')).toBeTruthy();
  });
});
