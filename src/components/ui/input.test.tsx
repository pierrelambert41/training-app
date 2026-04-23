import React from 'react';
import { render } from '@testing-library/react-native';
import { Input } from './input';

describe('Input', () => {
  it('renders without label or error', () => {
    const { UNSAFE_getByType } = render(<Input placeholder="Email" />);
    const { TextInput } = require('react-native');
    expect(UNSAFE_getByType(TextInput)).toBeTruthy();
  });

  it('renders label when provided', () => {
    const { getByText } = render(<Input label="Email" />);
    expect(getByText('Email')).toBeTruthy();
  });

  it('renders error message when provided', () => {
    const { getByText } = render(<Input error="Champ requis" />);
    expect(getByText('Champ requis')).toBeTruthy();
  });

  it('does not render error text when no error', () => {
    const { queryByText } = render(<Input placeholder="x" />);
    expect(queryByText('Champ requis')).toBeNull();
  });
});
