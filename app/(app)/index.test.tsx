import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/stores/auth-store';
import HomeScreen from './index';

const mockLogout = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    logout: mockLogout,
  }),
}));

const fakeUser = { id: 'u1', email: 'test@example.com', createdAt: '2026-04-23T10:00:00Z' };

beforeEach(() => {
  mockLogout.mockReset();
  useAuthStore.setState({ user: null, isAuthenticated: false, isHydrated: true });
});

describe('HomeScreen', () => {
  it('affiche la section séance du jour et progression', () => {
    render(<HomeScreen />);
    expect(screen.getByText('SÉANCE DU JOUR')).toBeTruthy();
    expect(screen.getByText('PROGRESSION')).toBeTruthy();
  });

  it("affiche l'email de l'utilisateur connecté", () => {
    useAuthStore.setState({ user: fakeUser, isAuthenticated: true, isHydrated: true });
    render(<HomeScreen />);
    expect(screen.getByText('test@example.com')).toBeTruthy();
  });

  it("n'affiche pas d'email si aucun utilisateur", () => {
    render(<HomeScreen />);
    expect(screen.queryByText('test@example.com')).toBeNull();
  });

  it('appelle logout au tap sur le bouton de déconnexion', async () => {
    mockLogout.mockResolvedValue(undefined);
    render(<HomeScreen />);
    fireEvent.press(screen.getByTestId('logout-button'));
    await waitFor(() => expect(mockLogout).toHaveBeenCalledTimes(1));
  });

  it('affiche les états vides quand pas de données', () => {
    render(<HomeScreen />);
    expect(screen.getAllByText('Aucune séance planifiée')).toHaveLength(1);
    expect(screen.getAllByText('Pas encore de données')).toHaveLength(1);
  });
});
