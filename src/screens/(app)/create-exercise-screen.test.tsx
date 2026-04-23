import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateExerciseScreen from './create-exercise-screen';
import { DBContext } from '@/hooks/use-db';
import { useAuthStore } from '@/stores/auth-store';
import type { SQLiteDatabase } from 'expo-sqlite';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('uuid', () => ({ v4: () => 'test-uuid-1234' }));

function makeMockDb(runResult: Promise<void> = Promise.resolve()): SQLiteDatabase {
  return {
    runAsync: jest.fn().mockReturnValue(runResult),
    getAllAsync: jest.fn().mockResolvedValue([]),
  } as unknown as SQLiteDatabase;
}

function renderWithProviders(db: SQLiteDatabase) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DBContext.Provider value={db}>
        <CreateExerciseScreen />
      </DBContext.Provider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockBack.mockReset();
  mockPush.mockReset();
  useAuthStore.setState({ user: { id: 'user-1', email: 'test@example.com' }, isAuthenticated: true, isHydrated: true });
});

describe('CreateExerciseScreen', () => {
  it('affiche le formulaire', () => {
    const db = makeMockDb();
    renderWithProviders(db);

    expect(screen.getByTestId('create-exercise-screen')).toBeTruthy();
    expect(screen.getByTestId('create-exercise-name-input')).toBeTruthy();
    expect(screen.getByTestId('create-exercise-movement-pattern')).toBeTruthy();
    expect(screen.getByTestId('create-exercise-primary-muscles')).toBeTruthy();
    expect(screen.getByTestId('create-exercise-secondary-muscles')).toBeTruthy();
    expect(screen.getByTestId('create-exercise-equipment')).toBeTruthy();
    expect(screen.getByTestId('create-exercise-notes-input')).toBeTruthy();
    expect(screen.getByTestId('create-exercise-submit')).toBeTruthy();
  });

  it('affiche une erreur si le nom est vide à la soumission', async () => {
    const db = makeMockDb();
    renderWithProviders(db);

    fireEvent.press(screen.getByTestId('create-exercise-submit'));

    await waitFor(() => {
      expect(screen.getByText('Le nom est requis.')).toBeTruthy();
    });
  });

  it('affiche une erreur si le nom fait moins de 2 caractères', async () => {
    const db = makeMockDb();
    renderWithProviders(db);

    fireEvent.changeText(screen.getByTestId('create-exercise-name-input'), 'A');
    fireEvent.press(screen.getByTestId('create-exercise-submit'));

    await waitFor(() => {
      expect(screen.getByText('Le nom doit contenir au moins 2 caractères.')).toBeTruthy();
    });
  });

  it('affiche une erreur si aucun muscle primaire sélectionné', async () => {
    const db = makeMockDb();
    renderWithProviders(db);

    fireEvent.changeText(screen.getByTestId('create-exercise-name-input'), 'Curl barre');
    fireEvent.press(screen.getByTestId('create-exercise-submit'));

    await waitFor(() => {
      expect(screen.getByText('Sélectionnez au moins un muscle primaire.')).toBeTruthy();
    });
  });

  it('affiche une erreur si aucun patron de mouvement sélectionné', async () => {
    const db = makeMockDb();
    renderWithProviders(db);

    fireEvent.changeText(screen.getByTestId('create-exercise-name-input'), 'Curl barre');
    fireEvent.press(screen.getByTestId('create-exercise-primary-muscles-chip-biceps'));
    fireEvent.press(screen.getByTestId('create-exercise-submit'));

    await waitFor(() => {
      expect(screen.getByText('Sélectionnez un patron de mouvement.')).toBeTruthy();
    });
  });

  it('toggle les chips muscles primaires', () => {
    const db = makeMockDb();
    renderWithProviders(db);

    fireEvent.press(screen.getByTestId('create-exercise-primary-muscles-chip-biceps'));
    fireEvent.press(screen.getByTestId('create-exercise-primary-muscles-chip-biceps'));
  });

  it("sauvegarde l'exercice et ferme le modal en cas de succes", async () => {
    const db = makeMockDb();
    renderWithProviders(db);

    fireEvent.changeText(screen.getByTestId('create-exercise-name-input'), 'Curl barre');
    fireEvent.press(screen.getByTestId('create-exercise-movement-pattern-chip-isolation_upper'));
    fireEvent.press(screen.getByTestId('create-exercise-primary-muscles-chip-biceps'));
    fireEvent.press(screen.getByTestId('create-exercise-submit'));

    await waitFor(() => {
      expect(db.runAsync).toHaveBeenCalledTimes(1);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  it('insère avec is_custom=1 et le bon user_id', async () => {
    const db = makeMockDb();
    renderWithProviders(db);

    fireEvent.changeText(screen.getByTestId('create-exercise-name-input'), 'Curl barre');
    fireEvent.press(screen.getByTestId('create-exercise-movement-pattern-chip-isolation_upper'));
    fireEvent.press(screen.getByTestId('create-exercise-primary-muscles-chip-biceps'));
    fireEvent.press(screen.getByTestId('create-exercise-submit'));

    await waitFor(() => {
      const [sql, params] = (db.runAsync as jest.Mock).mock.calls[0] as [string, unknown[]];

      expect(sql).toContain('INSERT INTO exercises');
      expect(params).toContain('test-uuid-1234');
      expect(params).toContain('Curl barre');
      expect(params).toContain('isolation_upper');
      expect(params).toContain('user-1');
      expect(params).toContain(JSON.stringify(['biceps']));
    });
  });

  it('ne soumet pas si utilisateur non authentifié', async () => {
    useAuthStore.setState({ user: null, isAuthenticated: false, isHydrated: true });
    const db = makeMockDb();
    renderWithProviders(db);

    fireEvent.changeText(screen.getByTestId('create-exercise-name-input'), 'Curl barre');
    fireEvent.press(screen.getByTestId('create-exercise-primary-muscles-chip-biceps'));
    fireEvent.press(screen.getByTestId('create-exercise-submit'));

    await act(async () => {});
    expect(db.runAsync).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
