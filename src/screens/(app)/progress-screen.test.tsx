import { render, screen } from '@testing-library/react-native';
import ProgressRoute from '../../../app/(app)/(tabs)/progress';

describe('ProgressScreen', () => {
  it('affiche le titre Progrès', () => {
    render(<ProgressRoute />);
    expect(screen.getByText('Progrès')).toBeTruthy();
  });

  it('affiche les sections placeholder des cartes analytics à venir', () => {
    render(<ProgressRoute />);
    expect(screen.getByTestId('placeholder-e1rm')).toBeTruthy();
    expect(screen.getByTestId('placeholder-volume')).toBeTruthy();
    expect(screen.getByTestId('placeholder-bodyweight')).toBeTruthy();
    expect(screen.getByTestId('placeholder-fatigue')).toBeTruthy();
    expect(screen.getByTestId('placeholder-compliance')).toBeTruthy();
  });
});
