import React from 'react';
import { render } from '@testing-library/react-native';
import { ComplianceCard } from './compliance-card';

describe('ComplianceCard', () => {
  it('affiche le pourcentage et le détail x/y', () => {
    const { getByTestId } = render(
      <ComplianceCard
        compliance={{ percentage: 80, completedCount: 5, plannedCount: 6 }}
        hasActiveBlock
      />
    );
    expect(getByTestId('compliance-percentage').props.children.join('')).toBe('80%');
    expect(getByTestId('compliance-detail')).toBeTruthy();
  });

  it('passe en warning sous le seuil de 75% (assiduité business-rules §3.1)', () => {
    const { getByTestId, rerender } = render(
      <ComplianceCard
        compliance={{ percentage: 74, completedCount: 3, plannedCount: 4 }}
        hasActiveBlock
      />
    );
    expect(getByTestId('compliance-percentage').props.className).toContain(
      'text-status-warning'
    );
    rerender(
      <ComplianceCard
        compliance={{ percentage: 75, completedCount: 3, plannedCount: 4 }}
        hasActiveBlock
      />
    );
    expect(getByTestId('compliance-percentage').props.className).toContain(
      'text-status-success'
    );
  });

  it("affiche l'état sans bloc actif", () => {
    const { getByTestId } = render(
      <ComplianceCard compliance={null} hasActiveBlock={false} />
    );
    expect(getByTestId('compliance-no-block')).toBeTruthy();
  });

  it("affiche l'état bloc fraîchement démarré", () => {
    const { getByTestId } = render(
      <ComplianceCard compliance={null} hasActiveBlock />
    );
    expect(getByTestId('compliance-too-early')).toBeTruthy();
  });
});
