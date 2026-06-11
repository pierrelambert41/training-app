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

describe('ProgressScreen', () => {
  it('affiche le titre Progrès', () => {
    render(<ProgressRoute />);
    expect(screen.getByText('Progrès')).toBeTruthy();
  });

  it('affiche la carte e1RM et les sections placeholder restantes', () => {
    render(<ProgressRoute />);
    expect(screen.getByTestId('e1rm-card')).toBeTruthy();
    expect(screen.getByTestId('placeholder-volume')).toBeTruthy();
    expect(screen.getByTestId('placeholder-bodyweight')).toBeTruthy();
    expect(screen.getByTestId('placeholder-fatigue')).toBeTruthy();
    expect(screen.getByTestId('placeholder-compliance')).toBeTruthy();
  });
});
