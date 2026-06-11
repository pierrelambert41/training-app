import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DailyCheckinCard } from './daily-checkin-card';
import type { RecoveryLog } from '@/types';

const TODAY_LOG: RecoveryLog = {
  id: 'rl1',
  userId: 'u1',
  date: '2026-06-11',
  sleepHours: null,
  sleepQuality: 7,
  energy: 6,
  stress: null,
  motivation: null,
  soreness: 3,
  jointPain: null,
  restingHr: null,
  hrv: null,
  weightKg: null,
  notes: 'note du matin',
  createdAt: '2026-06-11T08:00:00.000Z',
};

describe('DailyCheckinCard', () => {
  it('affiche le formulaire quand aucun log pour la date du jour', () => {
    const { getByTestId, queryByTestId } = render(
      <DailyCheckinCard todayLog={null} onSave={jest.fn()} isSaving={false} />
    );
    expect(getByTestId('daily-checkin-form')).toBeTruthy();
    expect(getByTestId('checkin-sleep-slider')).toBeTruthy();
    expect(getByTestId('checkin-energy-slider')).toBeTruthy();
    expect(getByTestId('checkin-soreness-slider')).toBeTruthy();
    expect(queryByTestId('daily-checkin-summary')).toBeNull();
  });

  it('soumet les valeurs des curseurs et la note', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <DailyCheckinCard todayLog={null} onSave={onSave} isSaving={false} />
    );

    fireEvent(getByTestId('checkin-sleep-slider'), 'valueChange', 8);
    fireEvent(getByTestId('checkin-energy-slider'), 'valueChange', 4);
    fireEvent(getByTestId('checkin-soreness-slider'), 'valueChange', 6);
    fireEvent.changeText(getByTestId('checkin-notes-input'), 'grosse journée');
    fireEvent.press(getByTestId('checkin-submit-button'));

    expect(onSave).toHaveBeenCalledWith({
      sleepQuality: 8,
      energy: 4,
      soreness: 6,
      notes: 'grosse journée',
    });
  });

  it('affiche le résumé compact quand le log du jour existe', () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <DailyCheckinCard todayLog={TODAY_LOG} onSave={jest.fn()} isSaving={false} />
    );
    expect(getByTestId('daily-checkin-summary')).toBeTruthy();
    expect(queryByTestId('daily-checkin-form')).toBeNull();
    expect(getByText('Sommeil')).toBeTruthy();
    expect(getByText('7')).toBeTruthy();
    expect(getByText('Énergie')).toBeTruthy();
    expect(getByText('6')).toBeTruthy();
    expect(getByText('Courbatures')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('note du matin')).toBeTruthy();
  });

  it('repasse en édition pré-remplie depuis le résumé', () => {
    const onSave = jest.fn();
    const { getByTestId } = render(
      <DailyCheckinCard todayLog={TODAY_LOG} onSave={onSave} isSaving={false} />
    );

    fireEvent.press(getByTestId('daily-checkin-edit'));
    expect(getByTestId('daily-checkin-form')).toBeTruthy();

    // Valider sans toucher aux curseurs : renvoie les valeurs existantes
    fireEvent.press(getByTestId('checkin-submit-button'));
    expect(onSave).toHaveBeenCalledWith({
      sleepQuality: 7,
      energy: 6,
      soreness: 3,
      notes: 'note du matin',
    });
  });
});
