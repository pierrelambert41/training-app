import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LibraryScreen from './library-screen';
import { DBContext } from '@/hooks/use-db';
import type { SQLiteDatabase } from 'expo-sqlite';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeMockDb(exercises: object[]): SQLiteDatabase {
  return {
    getAllAsync: jest.fn().mockResolvedValue(exercises),
  } as unknown as SQLiteDatabase;
}

function makeExerciseRow(overrides: Partial<{
  id: string;
  name: string;
  name_fr: string | null;
  category: string;
  movement_pattern: string;
  primary_muscles: string;
  secondary_muscles: string;
  equipment: string;
  log_type: string;
  is_unilateral: number;
  systemic_fatigue: string;
  movement_stability: string;
  morpho_tags: string;
  recommended_progression_type: string | null;
  alternatives: string;
  coaching_notes: string | null;
  tags: string;
  is_custom: number;
  created_by: string | null;
  created_at: string;
}> = {}) {
  return {
    id: 'ex-1',
    name: 'Bench Press',
    name_fr: 'Développé couché',
    category: 'compound',
    movement_pattern: 'horizontal_push',
    primary_muscles: '["pectorals"]',
    secondary_muscles: '["triceps"]',
    equipment: '["barbell"]',
    log_type: 'weight_reps',
    is_unilateral: 0,
    systemic_fatigue: 'high',
    movement_stability: 'stable',
    morpho_tags: '[]',
    recommended_progression_type: null,
    alternatives: '[]',
    coaching_notes: null,
    tags: '[]',
    is_custom: 0,
    created_by: null,
    created_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function renderWithProviders(db: SQLiteDatabase) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DBContext.Provider value={db}>
        <LibraryScreen />
      </DBContext.Provider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockPush.mockReset();
});

describe('LibraryScreen', () => {
  it('affiche la barre de recherche', async () => {
    const db = makeMockDb([]);
    renderWithProviders(db);
    expect(screen.getByTestId('library-search-input')).toBeTruthy();
  });

  it('affiche un indicateur de chargement pendant le fetch', async () => {
    let resolve: (value: object[]) => void = () => {};
    const db = {
      getAllAsync: jest.fn().mockReturnValue(new Promise((r) => { resolve = r; })),
    } as unknown as SQLiteDatabase;

    renderWithProviders(db);
    expect(screen.getByTestId('library-loading')).toBeTruthy();
    await act(async () => { resolve([]); });
  });

  it('affiche la liste des exercices', async () => {
    const rows = [
      makeExerciseRow({ id: 'ex-1', name: 'Bench Press', name_fr: 'Développé couché' }),
      makeExerciseRow({ id: 'ex-2', name: 'Squat', name_fr: 'Squat' }),
    ];
    const db = makeMockDb(rows);
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('library-list')).toBeTruthy();
    });
    expect(screen.getByText('Développé couché')).toBeTruthy();
    expect(screen.getByText('Squat')).toBeTruthy();
  });

  it('affiche un état vide si aucun exercice', async () => {
    const db = makeMockDb([]);
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByText('Aucun résultat')).toBeTruthy();
    });
  });

  it('navigue vers le détail au tap sur un exercice', async () => {
    const rows = [makeExerciseRow({ id: 'ex-1' })];
    const db = makeMockDb(rows);
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-row-ex-1')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('exercise-row-ex-1'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/(app)/exercise/[id]', params: { id: 'ex-1' } })
    );
  });

  it('met à jour la valeur de recherche en tapant', async () => {
    const db = makeMockDb([]);
    renderWithProviders(db);

    const input = screen.getByTestId('library-search-input');
    fireEvent.changeText(input, 'squat');
    expect(input.props.value).toBe('squat');
  });
});
