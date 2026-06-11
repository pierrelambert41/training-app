/**
 * Tests TA-140 — AIInsightBadge (fait saillant IA compact).
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { AIInsightBadge } from './ai-insight-badge';

describe('AIInsightBadge', () => {
  it.each(['positive', 'warning', 'neutral'] as const)(
    'rend le badge %s avec son texte',
    (sentiment) => {
      const { getByTestId, getByText } = render(
        <AIInsightBadge text="PR bench ce mois" sentiment={sentiment} />
      );
      expect(getByTestId(`ai-insight-badge-${sentiment}`)).toBeTruthy();
      expect(getByText('PR bench ce mois')).toBeTruthy();
    }
  );
});
