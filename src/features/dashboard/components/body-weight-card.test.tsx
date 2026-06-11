import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { BodyWeightCard, parseWeightInput } from './body-weight-card';
import type { BodyMetric } from '@/types';

function metric(date: string, weightKg: number): BodyMetric {
  return {
    id: `bm-${date}`,
    userId: 'u1',
    date,
    weightKg,
    notes: null,
    createdAt: `${date}T07:00:00.000Z`,
  };
}

describe('parseWeightInput', () => {
  it('accepte virgule et point décimal', () => {
    expect(parseWeightInput('82,5')).toBe(82.5);
    expect(parseWeightInput('82.5')).toBe(82.5);
    expect(parseWeightInput(' 90 ')).toBe(90);
  });

  it('rejette les valeurs hors bornes 30-300 et les saisies invalides', () => {
    expect(parseWeightInput('29.9')).toBeNull();
    expect(parseWeightInput('301')).toBeNull();
    expect(parseWeightInput('abc')).toBeNull();
    expect(parseWeightInput('')).toBeNull();
    expect(parseWeightInput('8,2,5')).toBeNull();
  });
});

describe('BodyWeightCard', () => {
  it('affiche la dernière pesée et la courbe', () => {
    const { getByTestId } = render(
      <BodyWeightCard
        metrics={[metric('2026-06-01', 83), metric('2026-06-10', 82.1)]}
        onSaveWeight={jest.fn()}
        isSaving={false}
      />
    );
    expect(getByTestId('body-weight-last').props.children).toBe('82.1 kg');
    expect(getByTestId('body-weight-chart')).toBeTruthy();
  });

  it('soumet un poids valide et vide le champ', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <BodyWeightCard metrics={[]} onSaveWeight={onSave} isSaving={false} />
    );
    fireEvent.changeText(getByTestId('body-weight-input'), '81,4');
    fireEvent.press(getByTestId('body-weight-submit'));
    expect(onSave).toHaveBeenCalledWith(81.4);
    expect(getByTestId('body-weight-input').props.value).toBe('');
  });

  it('affiche une erreur sur saisie invalide sans appeler onSaveWeight', () => {
    const onSave = jest.fn();
    const { getByTestId, getByText } = render(
      <BodyWeightCard metrics={[]} onSaveWeight={onSave} isSaving={false} />
    );
    fireEvent.changeText(getByTestId('body-weight-input'), '500');
    fireEvent.press(getByTestId('body-weight-submit'));
    expect(onSave).not.toHaveBeenCalled();
    expect(getByText(/Poids invalide/)).toBeTruthy();
  });

  it("affiche l'état vide sans pesée", () => {
    const { getByTestId } = render(
      <BodyWeightCard metrics={[]} onSaveWeight={jest.fn()} isSaving={false} />
    );
    expect(getByTestId('body-weight-chart-empty')).toBeTruthy();
  });
});
