import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ExerciseDetailScreen from './exercise-detail-screen';
import { DBContext } from '@/hooks/use-db';
import type { SQLiteDatabase } from 'expo-sqlite';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

type ExerciseRowDb = {
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
};

function makeExerciseRow(overrides: Partial<ExerciseRowDb> = {}): ExerciseRowDb {
  return {
    id: 'ex-1',
    name: 'Bench Press',
    name_fr: 'Développé couché',
    category: 'compound',
    movement_pattern: 'horizontal_push',
    primary_muscles: '["chest"]',
    secondary_muscles: '["triceps"]',
    equipment: '["barbell","bench"]',
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

function makeMockDb(exerciseRow: ExerciseRowDb | null, favoriteExists = false): SQLiteDatabase {
  return {
    getFirstAsync: jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('exercise_favorites')) {
        return Promise.resolve(favoriteExists ? { exercise_id: exerciseRow?.id } : null);
      }
      return Promise.resolve(exerciseRow);
    }),
    getAllAsync: jest.fn().mockResolvedValue(exerciseRow ? [exerciseRow] : []),
    runAsync: jest.fn().mockResolvedValue(undefined),
  } as unknown as SQLiteDatabase;
}

function renderWithProviders(db: SQLiteDatabase, exerciseId = 'ex-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <DBContext.Provider value={db}>
        <ExerciseDetailScreen exerciseId={exerciseId} />
      </DBContext.Provider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockPush.mockReset();
});

describe('ExerciseDetailScreen', () => {
  it('affiche un indicateur de chargement pendant le fetch', () => {
    let resolve: (value: ExerciseRowDb | null) => void = () => {};
    const db = {
      getFirstAsync: jest.fn().mockReturnValue(new Promise((r) => { resolve = r; })),
      getAllAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue(undefined),
    } as unknown as SQLiteDatabase;

    renderWithProviders(db);
    expect(screen.getByTestId('exercise-detail-loading')).toBeTruthy();

    act(() => { resolve(null); });
  });

  it('affiche "introuvable" si l\'exercice n\'existe pas', async () => {
    const db = makeMockDb(null);
    renderWithProviders(db, 'unknown-id');

    await waitFor(() => {
      expect(screen.getByTestId('exercise-detail-not-found')).toBeTruthy();
    });
  });

  it('affiche le nom français de l\'exercice', async () => {
    const db = makeMockDb(makeExerciseRow());
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-detail-name')).toBeTruthy();
    });
    expect(screen.getByText('Développé couché')).toBeTruthy();
  });

  it('affiche la catégorie traduite', async () => {
    const db = makeMockDb(makeExerciseRow({ category: 'compound' }));
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-detail-category')).toBeTruthy();
    });
    expect(screen.getByText('Poly-articulaire')).toBeTruthy();
  });

  it('affiche les muscles principaux traduits', async () => {
    const db = makeMockDb(makeExerciseRow({ primary_muscles: '["chest"]' }));
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByText('Pectoraux')).toBeTruthy();
    });
  });

  it('affiche les notes de coaching', async () => {
    const db = makeMockDb(makeExerciseRow({ coaching_notes: 'Garder les omoplates rétractées.' }));
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-detail-coaching-notes')).toBeTruthy();
    });
    expect(screen.getByText('Garder les omoplates rétractées.')).toBeTruthy();
  });

  it('n\'affiche pas la section coaching si vide', async () => {
    const db = makeMockDb(makeExerciseRow({ coaching_notes: null }));
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-detail-screen')).toBeTruthy();
    });
    expect(screen.queryByTestId('exercise-detail-coaching-notes')).toBeNull();
  });

  it('affiche le bouton favori non actif par défaut', async () => {
    const db = makeMockDb(makeExerciseRow(), false);
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-detail-favorite-button')).toBeTruthy();
    });
    expect(screen.getByText('☆')).toBeTruthy();
  });

  it('affiche le bouton favori actif si l\'exercice est en favori', async () => {
    const db = makeMockDb(makeExerciseRow(), true);
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByText('★')).toBeTruthy();
    });
  });

  it('appelle toggle au tap sur le bouton favori', async () => {
    const db = makeMockDb(makeExerciseRow(), false);
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-detail-favorite-button')).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId('exercise-detail-favorite-button'));
    expect(db.getFirstAsync).toHaveBeenCalled();
  });

  it('affiche les alternatives si présentes et navigue au tap', async () => {
    const altRow = makeExerciseRow({ id: 'ex-2', name: 'Incline Press', name_fr: 'Développé incliné' });
    const db = {
      getFirstAsync: jest.fn().mockImplementation((sql: string, params?: unknown[]) => {
        if (sql.includes('exercise_favorites')) return Promise.resolve(null);
        const id = Array.isArray(params) ? params[0] : null;
        if (id === 'ex-1') return Promise.resolve(makeExerciseRow({ alternatives: '["ex-2"]' }));
        return Promise.resolve(null);
      }),
      getAllAsync: jest.fn().mockResolvedValue([altRow]),
      runAsync: jest.fn().mockResolvedValue(undefined),
    } as unknown as SQLiteDatabase;

    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-detail-alternatives')).toBeTruthy();
    });
    expect(screen.getByText('Développé incliné')).toBeTruthy();

    fireEvent.press(screen.getByTestId('alternative-row-ex-2'));
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/(app)/exercise/[id]', params: { id: 'ex-2' } })
    );
  });

  it('n\'affiche pas la section alternatives si vide', async () => {
    const db = makeMockDb(makeExerciseRow({ alternatives: '[]' }));
    renderWithProviders(db);

    await waitFor(() => {
      expect(screen.getByTestId('exercise-detail-screen')).toBeTruthy();
    });
    expect(screen.queryByTestId('exercise-detail-alternatives')).toBeNull();
  });
});
