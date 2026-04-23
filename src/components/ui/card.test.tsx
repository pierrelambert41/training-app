import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Card } from './card';

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Card>
        <Text>Contenu</Text>
      </Card>
    );
    expect(getByText('Contenu')).toBeTruthy();
  });

  it('renders with elevated variant', () => {
    const { getByText } = render(
      <Card elevation="elevated">
        <Text>Élevé</Text>
      </Card>
    );
    expect(getByText('Élevé')).toBeTruthy();
  });

  it('accepts additional className', () => {
    const { getByText } = render(
      <Card className="w-full">
        <Text>Large</Text>
      </Card>
    );
    expect(getByText('Large')).toBeTruthy();
  });
});
