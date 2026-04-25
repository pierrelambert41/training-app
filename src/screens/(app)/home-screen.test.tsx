import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useActiveProgramStore } from '@/stores/active-program-store';
import HomeScreen from '../../../app/(app)/index';

const mockLogout = jest.fn();
const mockPush = jest.fn();

jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    logout: mockLogout,
    isLoading: false,
  }),
}));

jest.mock('@/hooks/use-db', () => ({
  useDB: () => ({}),
}));

jest.mock('@/dev/seed-active-block', () => ({
  seedActiveBlock: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/hooks/use-active-program', () => ({
  useActiveProgram: () => ({ data: null }),
}));

const mockUseTodayWorkout = jest.fn(() => ({ data: null }));
jest.mock('@/hooks/use-today-workout', () => ({
  useTodayWorkout: (...args: unknown[]) => mockUseTodayWorkout(...args),
}));

jest.mock('@/stores/session-store', () => ({
  useSessionStore: () => null,
}));

const fakeUser = { id: 'u1', email: 'test@example.com', createdAt: '2026-04-23T10:00:00Z' };

beforeEach(() => {
  mockLogout.mockReset();
  mockPush.mockReset();
  mockUseTodayWorkout.mockReturnValue({ data: null });
  useAuthStore.setState({ user: null, isAuthenticated: false, isHydrated: true });
  useActiveProgramStore.setState({
    program: null,
    activeBlock: null,
    workoutDays: [],
    sessionCountsByDayId: {},
  });
});

describe('HomeScreen', () => {
  it("affiche le titre Aujourd'hui", () => {
    render(<HomeScreen />);
    expect(screen.getByText("Aujourd'hui")).toBeTruthy();
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

  it('affiche le CTA générer programme quand pas de données', () => {
    render(<HomeScreen />);
    expect(screen.getByTestId('generate-program-button')).toBeTruthy();
  });

  it('affiche "Démarrer la séance" si un workout day existe pour aujourd\'hui', () => {
    mockUseTodayWorkout.mockReturnValue({
      data: {
        state: 'workout',
        data: {
          workoutDay: { id: 'wd1', title: 'Push A', splitType: 'push', estimatedDurationMin: 60, dayOrder: 1, blockId: 'b1', createdAt: '' },
          plannedExercises: [],
          sessionStatus: 'progression',
          lastCompletedSession: null,
          streak: 3,
        },
      },
    });
    render(<HomeScreen />);
    expect(screen.getByTestId('start-session-button')).toBeTruthy();
  });

  it('affiche "Reprendre la séance" si une session in_progress existe', () => {
    mockUseTodayWorkout.mockReturnValue({
      data: {
        state: 'in_progress',
        data: {
          workoutDay: { id: 'wd1', title: 'Pull B', splitType: 'pull', estimatedDurationMin: 50, dayOrder: 2, blockId: 'b1', createdAt: '' },
          plannedExercises: [],
          sessionStatus: 'maintien',
          lastCompletedSession: null,
          streak: 1,
        },
      },
    });
    render(<HomeScreen />);
    expect(screen.getByTestId('resume-session-button')).toBeTruthy();
  });

  it("affiche 'Jour de repos' si pas de workout day aujourd'hui", () => {
    mockUseTodayWorkout.mockReturnValue({
      data: {
        state: 'rest_day',
        lastCompletedSession: null,
        streak: 2,
      },
    });
    render(<HomeScreen />);
    expect(screen.getByText('Jour de repos')).toBeTruthy();
  });
});
