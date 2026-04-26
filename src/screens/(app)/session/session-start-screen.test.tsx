import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/features/auth/stores/auth-store';
import SessionStartScreen from '../../../../app/(app)/session/start';

const mockReplace = jest.fn();
const mockBack = jest.fn();

// @/features/auth charge supabase.ts qui ne peut pas être parsé par jest.
// On mocke le module entier et on expose le vrai useAuthStore depuis le chemin profond.
jest.mock('@/features/auth', () => ({
  useAuthStore: jest.requireActual('@/features/auth/stores/auth-store').useAuthStore,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({ workoutDayId: 'wd-test' }),
}));

jest.mock('@/hooks/use-db', () => ({
  useDB: () => ({}),
}));

const mockStartSession = jest.fn();
jest.mock('@/stores/session-store', () => ({
  useSessionStore: (selector: (s: { startSession: typeof mockStartSession }) => unknown) =>
    selector({ startSession: mockStartSession }),
}));

const mockGetInProgress = jest.fn();
jest.mock('@/services/sessions', () => ({
  getInProgressSessionForWorkoutDay: (...args: unknown[]) => mockGetInProgress(...args),
}));

const fakeUser = { id: 'u1', email: 'test@example.com', createdAt: '2026-04-23T10:00:00Z' };

beforeEach(() => {
  mockReplace.mockReset();
  mockStartSession.mockReset().mockResolvedValue(undefined);
  mockGetInProgress.mockReset().mockResolvedValue(null);
  useAuthStore.setState({ user: fakeUser, isAuthenticated: true, isHydrated: true });
});

describe('SessionStartScreen', () => {
  it('affiche les 3 steppers readiness', async () => {
    render(<SessionStartScreen />);
    await waitFor(() => {
      expect(screen.getByText('Énergie')).toBeTruthy();
      expect(screen.getByText('Sommeil')).toBeTruthy();
      expect(screen.getByText('Motivation')).toBeTruthy();
    });
  });

  it('affiche les boutons Démarrer et Passer', async () => {
    render(<SessionStartScreen />);
    await waitFor(() => {
      expect(screen.getByTestId('start-session-button')).toBeTruthy();
      expect(screen.getByTestId('skip-readiness-button')).toBeTruthy();
    });
  });

  it('redirige vers live si une session in_progress existe déjà', async () => {
    mockGetInProgress.mockResolvedValue({ id: 'existing-session', status: 'in_progress' });
    render(<SessionStartScreen />);
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(app)/session/live');
    });
  });

  it('crée la session avec readiness au tap sur Démarrer', async () => {
    render(<SessionStartScreen />);
    await waitFor(() => screen.getByTestId('start-session-button'));

    fireEvent.press(screen.getByTestId('start-session-button'));

    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'u1',
          workoutDayId: 'wd-test',
          energy: 7,
          sleepQuality: 7,
          motivation: 7,
        })
      );
      expect(mockReplace).toHaveBeenCalledWith('/(app)/session/live');
    });
  });

  it('crée la session avec readiness null au tap sur Passer', async () => {
    render(<SessionStartScreen />);
    await waitFor(() => screen.getByTestId('skip-readiness-button'));

    fireEvent.press(screen.getByTestId('skip-readiness-button'));

    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: 'u1',
          energy: null,
          sleepQuality: null,
          motivation: null,
        })
      );
      expect(mockReplace).toHaveBeenCalledWith('/(app)/session/live');
    });
  });
});
