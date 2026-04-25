import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useSessionStore } from '@/stores/session-store';
import SessionLiveScreen from '../../../../app/(app)/session/live';
import type { Session, PlannedExercise } from '@/types';

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/hooks/use-db', () => ({
  useDB: () => ({}),
}));

jest.mock('@/hooks/use-last-set-for-exercise', () => ({
  useLastSetForExercise: () => ({ lastSet: null, loading: false }),
}));

jest.mock('@/hooks/use-session-exercises', () => ({
  useSessionExercises: () => ({
    data: {
      exercisesById: new Map([
        [
          'ex-1',
          {
            id: 'ex-1',
            name: 'Bench Press',
            nameFr: null,
            primaryMuscles: ['pectoraux'],
            secondaryMuscles: [],
            equipment: ['barbell'],
            category: 'compound',
            movementPattern: 'horizontal_push',
            logType: 'weight_reps',
            isUnilateral: false,
            systemicFatigue: 'high',
            movementStability: 'stable',
            morphoTags: [],
            recommendedProgressionType: null,
            alternatives: [],
            coachingNotes: null,
            tags: [],
            isCustom: false,
            createdBy: null,
            createdAt: '2026-04-25T10:00:00Z',
          },
        ],
      ]),
      workoutDay: { id: 'wd-1', blockId: 'b-1', title: 'Séance A', dayOrder: 1, splitType: 'push', estimatedDurationMin: 60, createdAt: '2026-04-25T10:00:00Z' },
    },
    isLoading: false,
  }),
}));

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({
        sound: {
          setOnPlaybackStatusUpdate: jest.fn(),
          unloadAsync: jest.fn(),
        },
      })),
    },
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notif-id')),
  cancelScheduledNotificationAsync: jest.fn(),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: {
    Success: 'Success',
  },
}));

const mockLogSet = jest.fn();
const mockCompleteSession = jest.fn();

const fakeSession: Session = {
  id: 'session-1',
  userId: 'u1',
  workoutDayId: 'wd-1',
  blockId: null,
  date: '2026-04-25',
  startedAt: new Date(Date.now() - 65_000).toISOString(),
  endedAt: null,
  status: 'in_progress',
  readiness: null,
  energy: 7,
  motivation: 8,
  sleepQuality: 7,
  preSessionNotes: null,
  completionScore: null,
  performanceScore: null,
  fatigueScore: null,
  postSessionNotes: null,
  deviceId: null,
  syncedAt: null,
  createdAt: '2026-04-25T10:00:00Z',
  updatedAt: '2026-04-25T10:00:00Z',
};

const fakePlannedExercise: PlannedExercise = {
  id: 'pe-1',
  workoutDayId: 'wd-1',
  exerciseId: 'ex-1',
  exerciseOrder: 1,
  role: 'main',
  sets: 3,
  repRangeMin: 6,
  repRangeMax: 8,
  targetRir: 2,
  restSeconds: 120,
  tempo: null,
  progressionType: 'double_progression',
  progressionConfig: {
    increment_kg: 2.5,
    min_reps: 6,
    max_reps: 8,
    all_sets_at_max_to_increase: true,
    regressions_before_alert: 2,
  },
  notes: 'Bench Press',
  createdAt: '2026-04-25T10:00:00Z',
};

function setupStore(
  partial: Partial<ReturnType<typeof useSessionStore.getState>> = {}
) {
  useSessionStore.setState({
    session: fakeSession,
    plannedExercises: [fakePlannedExercise],
    setLogs: [],
    currentExerciseIndex: 0,
    restTimer: null,
    logSet: mockLogSet,
    completeSession: mockCompleteSession,
    ...partial,
  } as ReturnType<typeof useSessionStore.getState>);
}

beforeEach(() => {
  mockReplace.mockReset();
  mockLogSet.mockReset().mockResolvedValue(undefined);
  mockCompleteSession.mockReset().mockResolvedValue(undefined);
});

describe('SessionLiveScreen', () => {
  it('affiche le timer et le header de séance', async () => {
    setupStore();
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByText('Séance A')).toBeTruthy();
      expect(screen.getByText('1/1')).toBeTruthy();
    });
  });

  it("affiche le nom de l'exercice courant", async () => {
    setupStore();
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByText('Bench Press')).toBeTruthy();
    });
  });

  it('affiche les lignes de sets planifiés (3 sets)', async () => {
    setupStore();
    render(<SessionLiveScreen />);

    await waitFor(() => {
      const allSetNumbers = screen.getAllByText(/^[123]$/);
      expect(allSetNumbers.length).toBeGreaterThanOrEqual(3);
    });
  });

  it('affiche le bouton Log Set', async () => {
    setupStore();
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('log-set-button')).toBeTruthy();
    });
  });

  it('le bouton Log Set est désactivé si charge et reps vides', async () => {
    setupStore();
    render(<SessionLiveScreen />);

    await waitFor(() => {
      const btn = screen.getByTestId('log-set-button');
      expect(btn.props.accessibilityState?.disabled).toBeTruthy();
    });
  });

  it('appelle logSet avec les valeurs saisies', async () => {
    setupStore();
    render(<SessionLiveScreen />);

    await waitFor(() => screen.getByTestId('log-set-button'));

    const loadTextInput = screen.getByTestId('load-input');
    const repsTextInput = screen.getByTestId('reps-input');

    fireEvent.changeText(loadTextInput, '100');
    fireEvent.changeText(repsTextInput, '8');

    await act(async () => {
      fireEvent.press(screen.getByTestId('log-set-button'));
    });

    expect(mockLogSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        exerciseId: 'ex-1',
        plannedExerciseId: 'pe-1',
        setNumber: 1,
        load: 100,
        reps: 8,
        rir: 2,
        completed: true,
      })
    );
  });

  it('affiche un message "séance terminée" quand tous les sets sont loggés', async () => {
    const loggedSets = Array.from({ length: 3 }, (_, i) => ({
      id: `sl-${i + 1}`,
      sessionId: 'session-1',
      exerciseId: 'ex-1',
      plannedExerciseId: 'pe-1',
      setNumber: i + 1,
      targetLoad: null,
      targetReps: null,
      targetRir: null,
      load: 100,
      reps: 8,
      rir: 2,
      durationSeconds: null,
      distanceMeters: null,
      completed: true,
      side: null,
      notes: null,
      createdAt: '2026-04-25T10:00:00Z',
      updatedAt: '2026-04-25T10:00:00Z',
    }));

    setupStore({ setLogs: loggedSets });
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tous les sets terminés')).toBeTruthy();
    });
  });

  it('termine la séance et navigue vers home', async () => {
    setupStore();
    render(<SessionLiveScreen />);

    await waitFor(() => screen.getByTestId('end-session-button'));

    await act(async () => {
      fireEvent.press(screen.getByTestId('end-session-button'));
    });

    expect(mockCompleteSession).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/(app)');
    });
  });

  it('affiche un message si aucune session en cours', async () => {
    useSessionStore.setState({
      session: null,
      plannedExercises: [],
      setLogs: [],
      currentExerciseIndex: 0,
      restTimer: null,
    } as ReturnType<typeof useSessionStore.getState>);

    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByText('Aucune séance en cours.')).toBeTruthy();
    });
  });
});
