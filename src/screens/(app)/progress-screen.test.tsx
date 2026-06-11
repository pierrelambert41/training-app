import { render, screen } from '@testing-library/react-native';
import ProgressRoute from '../../../app/(app)/(tabs)/progress';

// TEST-01 : mocker le hook au niveau de son fichier, pas l'index de la feature.
jest.mock('@/features/dashboard/hooks/use-e1rm-history', () => ({
  useE1rmHistory: jest.fn(() => ({
    exercises: [],
    selectedExerciseId: null,
    selectExercise: jest.fn(),
    points: [],
    isLoading: false,
  })),
}));

jest.mock('@/features/dashboard/hooks/use-weekly-volume', () => ({
  useWeeklyVolume: jest.fn(() => ({
    volumes: [],
    isLoading: false,
    weekStart: '2026-06-08',
    weekOffset: 0,
    goToPreviousWeek: jest.fn(),
    goToNextWeek: jest.fn(),
  })),
}));

describe('ProgressScreen', () => {
  it('affiche le titre Progrès', () => {
    render(<ProgressRoute />);
    expect(screen.getByText('Progrès')).toBeTruthy();
  });

  it('affiche les cartes e1RM et volume, et les placeholders restants', () => {
    render(<ProgressRoute />);
    expect(screen.getByTestId('e1rm-card')).toBeTruthy();
    expect(screen.getByTestId('volume-card')).toBeTruthy();
    expect(screen.getByTestId('placeholder-bodyweight')).toBeTruthy();
    expect(screen.getByTestId('placeholder-fatigue')).toBeTruthy();
    expect(screen.getByTestId('placeholder-compliance')).toBeTruthy();
  });
});
