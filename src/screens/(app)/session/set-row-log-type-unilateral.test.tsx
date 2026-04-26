/**
 * Tests pour TA-82 / TA-99 : log_type adaptatif + exercices unilatéraux
 * avec édition inline par ligne.
 *
 * Architecture : les mocks de `use-session-exercises` et des hooks de
 * last-set sont déclarés en haut avec jest.mock() (hoisté par Babel).
 * On change la valeur retournée dynamiquement via des variables mutables.
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { useSessionStore } from '@/stores/session-store';
import SessionLiveScreen from '../../../../app/(app)/session/live';
import type { Session, PlannedExercise, SetLog } from '@/types';

// ---------------------------------------------------------------------------
// Mutable mock state
// ---------------------------------------------------------------------------

let mockExercisesById = new Map<string, object>();
let mockLastSet: object | null = null;
let mockLastSetLeft: object | null = null;
let mockLastSetRight: object | null = null;

// ---------------------------------------------------------------------------
// Static mocks (hoisted by jest)
// ---------------------------------------------------------------------------

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock('@/hooks/use-db', () => ({
  useDB: () => ({}),
}));

jest.mock('@/hooks/use-session-exercises', () => ({
  useSessionExercises: () => ({
    data: {
      exercisesById: mockExercisesById,
      workoutDay: {
        id: 'wd-1',
        blockId: null,
        title: 'Séance Test',
        dayOrder: 1,
        splitType: null,
        estimatedDurationMin: null,
        createdAt: '2026-04-25T10:00:00Z',
      },
    },
    isLoading: false,
  }),
}));

jest.mock('@/hooks/use-last-set-for-exercise', () => ({
  useLastSetForExercise: () => ({ lastSet: mockLastSet, loading: false }),
}));

jest.mock('@/hooks/use-last-set-for-exercise-side', () => ({
  useLastSetForExerciseSide: () => ({
    lastSetLeft: mockLastSetLeft,
    lastSetRight: mockLastSetRight,
    loading: false,
  }),
}));

jest.mock('@/hooks/use-exercises', () => ({
  useExercises: () => ({ data: [], isLoading: false }),
}));

jest.mock('@/hooks/use-debounce', () => ({
  useDebounce: (value: string) => value,
}));

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(() =>
        Promise.resolve({
          sound: {
            setOnPlaybackStatusUpdate: jest.fn(),
            unloadAsync: jest.fn(),
          },
        })
      ),
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
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'Light',
    Medium: 'Medium',
    Heavy: 'Heavy',
  },
  NotificationFeedbackType: { Success: 'Success' },
}));

// ---------------------------------------------------------------------------
// Exercise fixtures
// ---------------------------------------------------------------------------

const BW_EXERCISE = {
  id: 'ex-bw',
  name: 'Pull-ups',
  nameFr: 'Tractions',
  primaryMuscles: ['dos'],
  secondaryMuscles: [],
  equipment: [],
  category: 'bodyweight',
  movementPattern: 'vertical_pull',
  logType: 'bodyweight_reps',
  isUnilateral: false,
  systemicFatigue: 'moderate',
  movementStability: 'stable',
  morphoTags: [],
  recommendedProgressionType: null,
  alternatives: [],
  coachingNotes: null,
  tags: [],
  isCustom: false,
  createdBy: null,
  createdAt: '2026-04-25T10:00:00Z',
};

const DURATION_EXERCISE = {
  id: 'ex-dur',
  name: 'Planche',
  nameFr: 'Planche',
  primaryMuscles: ['core'],
  secondaryMuscles: [],
  equipment: [],
  category: 'bodyweight',
  movementPattern: 'core',
  logType: 'duration',
  isUnilateral: false,
  systemicFatigue: 'low',
  movementStability: 'stable',
  morphoTags: [],
  recommendedProgressionType: null,
  alternatives: [],
  coachingNotes: null,
  tags: [],
  isCustom: false,
  createdBy: null,
  createdAt: '2026-04-25T10:00:00Z',
};

const DISTANCE_DURATION_EXERCISE = {
  id: 'ex-dd',
  name: 'Sled Push',
  nameFr: 'Pousse de traîneau',
  primaryMuscles: ['quadriceps'],
  secondaryMuscles: [],
  equipment: ['sled'],
  category: 'machine',
  movementPattern: 'squat',
  logType: 'distance_duration',
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
};

const UNILATERAL_EXERCISE = {
  id: 'ex-uni',
  name: 'Bulgarian Split Squat',
  nameFr: 'Squat bulgare',
  primaryMuscles: ['quadriceps'],
  secondaryMuscles: ['glutes'],
  equipment: ['dumbbell'],
  category: 'compound',
  movementPattern: 'unilateral_quad',
  logType: 'weight_reps',
  isUnilateral: true,
  systemicFatigue: 'high',
  movementStability: 'moderate',
  morphoTags: [],
  recommendedProgressionType: null,
  alternatives: [],
  coachingNotes: null,
  tags: [],
  isCustom: false,
  createdBy: null,
  createdAt: '2026-04-25T10:00:00Z',
};

// ---------------------------------------------------------------------------
// Store helpers
// ---------------------------------------------------------------------------

const fakeSession: Session = {
  id: 'session-1',
  userId: 'u1',
  workoutDayId: 'wd-1',
  blockId: null,
  date: '2026-04-25',
  startedAt: new Date(Date.now() - 60_000).toISOString(),
  endedAt: null,
  status: 'in_progress',
  readiness: null,
  energy: null,
  motivation: null,
  sleepQuality: null,
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

const mockLogSet = jest.fn().mockResolvedValue(undefined);
const mockCompleteSession = jest.fn().mockResolvedValue(undefined);
const mockEditSet = jest.fn();
const mockDeleteSet = jest.fn();

function makePlannedExercise(exerciseId: string, sets = 3): PlannedExercise {
  return {
    id: 'pe-1',
    workoutDayId: 'wd-1',
    exerciseId,
    exerciseOrder: 1,
    role: 'main',
    sets,
    repRangeMin: 8,
    repRangeMax: 12,
    targetRir: 2,
    restSeconds: 90,
    tempo: null,
    progressionType: 'accessory_linear',
    progressionConfig: {},
    notes: null,
    isUnplanned: false,
    createdAt: '2026-04-25T10:00:00Z',
  };
}

function setupStore(exerciseId: string, sets = 3, setLogs: SetLog[] = []) {
  useSessionStore.setState({
    session: fakeSession,
    plannedExercises: [makePlannedExercise(exerciseId, sets)],
    setLogs,
    currentExerciseIndex: 0,
    restTimer: null,
    logSet: mockLogSet,
    completeSession: mockCompleteSession,
    editSet: mockEditSet,
    deleteSet: mockDeleteSet,
    addUnplannedExercise: jest.fn(),
    updateSessionNotes: jest.fn(),
    updateExerciseRestSeconds: jest.fn(),
  } as ReturnType<typeof useSessionStore.getState>);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLastSet = null;
  mockLastSetLeft = null;
  mockLastSetRight = null;
});

// ---------------------------------------------------------------------------
// Tests : log_type = bodyweight_reps
// ---------------------------------------------------------------------------

describe('log_type = bodyweight_reps', () => {
  beforeEach(() => {
    mockExercisesById = new Map([['ex-bw', BW_EXERCISE]]);
  });

  it('affiche les champs inline Reps et Lest pour bodyweight_reps', async () => {
    setupStore('ex-bw', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('inline-reps-input')).toBeTruthy();
    });
  });

  it('affiche le bouton check sur la ligne courante', async () => {
    setupStore('ex-bw', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('check-set-button')).toBeTruthy();
    });
  });

  it('peut logger un set bodyweight_reps avec reps via check inline', async () => {
    setupStore('ex-bw', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => screen.getByTestId('inline-reps-input'));
    fireEvent.changeText(screen.getByTestId('inline-reps-input'), '10');

    await act(async () => {
      fireEvent.press(screen.getByTestId('check-set-button'));
    });

    expect(mockLogSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        reps: 10,
        side: null,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Tests : log_type = duration
// ---------------------------------------------------------------------------

describe('log_type = duration', () => {
  beforeEach(() => {
    mockExercisesById = new Map([['ex-dur', DURATION_EXERCISE]]);
  });

  it('affiche le champ Durée inline pour duration', async () => {
    setupStore('ex-dur', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('inline-duration-input')).toBeTruthy();
    });
  });

  it('peut logger un set duration avec durationSeconds via check inline', async () => {
    setupStore('ex-dur', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => screen.getByTestId('inline-duration-input'));
    fireEvent.changeText(screen.getByTestId('inline-duration-input'), '60');

    await act(async () => {
      fireEvent.press(screen.getByTestId('check-set-button'));
    });

    expect(mockLogSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        durationSeconds: 60,
        reps: null,
        load: null,
        side: null,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Tests : log_type = distance_duration
// ---------------------------------------------------------------------------

describe('log_type = distance_duration', () => {
  beforeEach(() => {
    mockExercisesById = new Map([['ex-dd', DISTANCE_DURATION_EXERCISE]]);
  });

  it('affiche les champs Distance et Durée inline pour distance_duration', async () => {
    setupStore('ex-dd', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('inline-distance-input')).toBeTruthy();
      expect(screen.getByTestId('inline-duration-input')).toBeTruthy();
    });
  });

  it('peut logger un set distance_duration avec distance et durée via check inline', async () => {
    setupStore('ex-dd', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => screen.getByTestId('inline-distance-input'));
    fireEvent.changeText(screen.getByTestId('inline-distance-input'), '20');
    fireEvent.changeText(screen.getByTestId('inline-duration-input'), '15');

    await act(async () => {
      fireEvent.press(screen.getByTestId('check-set-button'));
    });

    expect(mockLogSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        distanceMeters: 20,
        durationSeconds: 15,
        reps: null,
        load: null,
        side: null,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// Tests : exercice unilatéral 3×10/côté
// ---------------------------------------------------------------------------

describe('exercice unilatéral is_unilateral = true', () => {
  beforeEach(() => {
    mockExercisesById = new Map([['ex-uni', UNILATERAL_EXERCISE]]);
  });

  it('affiche 6 lignes (G×3 et D×3) pour 3 sets planifiés', async () => {
    setupStore('ex-uni', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => {
      const gRows = screen.getAllByText('G');
      const dRows = screen.getAllByText('D');
      expect(gRows.length).toBe(3);
      expect(dRows.length).toBe(3);
    });
  });

  it('la ligne courante (set 1 G) affiche les inputs inline', async () => {
    setupStore('ex-uni', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByTestId('inline-load-input')).toBeTruthy();
      expect(screen.getByTestId('inline-reps-input')).toBeTruthy();
      expect(screen.getByTestId('check-set-button')).toBeTruthy();
    });
  });

  it('peut logger le set 1 gauche avec side = left via check inline', async () => {
    setupStore('ex-uni', 3);
    render(<SessionLiveScreen />);

    await waitFor(() => screen.getByTestId('inline-load-input'));
    fireEvent.changeText(screen.getByTestId('inline-load-input'), '30');
    fireEvent.changeText(screen.getByTestId('inline-reps-input'), '10');

    await act(async () => {
      fireEvent.press(screen.getByTestId('check-set-button'));
    });

    expect(mockLogSet).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        exerciseId: 'ex-uni',
        setNumber: 1,
        load: 30,
        reps: 10,
        side: 'left',
      })
    );
  });

  it('après set gauche loggé, la ligne courante devient le set 1 DROIT', async () => {
    const leftLog: SetLog = {
      id: 'sl-left-1',
      sessionId: 'session-1',
      exerciseId: 'ex-uni',
      plannedExerciseId: 'pe-1',
      setNumber: 1,
      targetLoad: null,
      targetReps: null,
      targetRir: null,
      load: 30,
      reps: 10,
      rir: 2,
      durationSeconds: null,
      distanceMeters: null,
      completed: true,
      side: 'left',
      notes: null,
      createdAt: '2026-04-25T10:00:00Z',
      updatedAt: '2026-04-25T10:00:00Z',
    };

    setupStore('ex-uni', 3, [leftLog]);
    render(<SessionLiveScreen />);

    // La ligne courante (set 1 D) affiche les inputs inline
    await waitFor(() => {
      expect(screen.getByTestId('check-set-button')).toBeTruthy();
      // Le testID de la ligne courante est set-row-current-1-right
      expect(screen.getByTestId('set-row-current-1-right')).toBeTruthy();
    });
  });

  it('allSetsLogged = true après 6 sets (3L + 3R) — affiche "Tous les sets terminés"', async () => {
    const logs: SetLog[] = [];
    for (let i = 1; i <= 3; i++) {
      for (const side of ['left', 'right'] as const) {
        logs.push({
          id: `sl-${side}-${i}`,
          sessionId: 'session-1',
          exerciseId: 'ex-uni',
          plannedExerciseId: 'pe-1',
          setNumber: i,
          targetLoad: null,
          targetReps: null,
          targetRir: null,
          load: 30,
          reps: 10,
          rir: 2,
          durationSeconds: null,
          distanceMeters: null,
          completed: true,
          side,
          notes: null,
          createdAt: '2026-04-25T10:00:00Z',
          updatedAt: '2026-04-25T10:00:00Z',
        });
      }
    }

    setupStore('ex-uni', 3, logs);
    render(<SessionLiveScreen />);

    await waitFor(() => {
      expect(screen.getByText('Tous les sets terminés')).toBeTruthy();
    });
  });

  it('le prefill pour le côté gauche utilise le dernier log gauche', async () => {
    // G1 et D1 loggés, on est au set 2 G
    // Le prefill doit charger les valeurs de G1 (load=30, reps=10)
    const leftLog1: SetLog = {
      id: 'sl-left-1',
      sessionId: 'session-1',
      exerciseId: 'ex-uni',
      plannedExerciseId: 'pe-1',
      setNumber: 1,
      targetLoad: null,
      targetReps: null,
      targetRir: null,
      load: 30,
      reps: 10,
      rir: 2,
      durationSeconds: null,
      distanceMeters: null,
      completed: true,
      side: 'left',
      notes: null,
      createdAt: '2026-04-25T10:00:00Z',
      updatedAt: '2026-04-25T10:00:00Z',
    };

    const rightLog1: SetLog = {
      id: 'sl-right-1',
      sessionId: 'session-1',
      exerciseId: 'ex-uni',
      plannedExerciseId: 'pe-1',
      setNumber: 1,
      targetLoad: null,
      targetReps: null,
      targetRir: null,
      load: 28,
      reps: 9,
      rir: 2,
      durationSeconds: null,
      distanceMeters: null,
      completed: true,
      side: 'right',
      notes: null,
      createdAt: '2026-04-25T10:00:10Z',
      updatedAt: '2026-04-25T10:00:10Z',
    };

    setupStore('ex-uni', 3, [leftLog1, rightLog1]);
    render(<SessionLiveScreen />);

    // Après G1 + D1, la ligne courante est set 2 G — prefill doit montrer load=30, reps=10
    await waitFor(() => screen.getByTestId('inline-load-input'));

    const loadInput = screen.getByTestId('inline-load-input');
    const repsInput = screen.getByTestId('inline-reps-input');
    expect(loadInput.props.value).toBe('30');
    expect(repsInput.props.value).toBe('10');
  });

  it('le prefill pour le côté droit utilise le dernier log droit, pas le gauche', async () => {
    // G1 (load=30, reps=10), D1 (load=28, reps=9) et G2 (load=32, reps=11) loggés.
    // La ligne courante est set 2 D — prefill doit montrer D1 (load=28, reps=9)
    const leftLog1: SetLog = {
      id: 'sl-left-1',
      sessionId: 'session-1',
      exerciseId: 'ex-uni',
      plannedExerciseId: 'pe-1',
      setNumber: 1,
      targetLoad: null,
      targetReps: null,
      targetRir: null,
      load: 30,
      reps: 10,
      rir: 2,
      durationSeconds: null,
      distanceMeters: null,
      completed: true,
      side: 'left',
      notes: null,
      createdAt: '2026-04-25T10:00:00Z',
      updatedAt: '2026-04-25T10:00:00Z',
    };

    const rightLog1: SetLog = {
      id: 'sl-right-1',
      sessionId: 'session-1',
      exerciseId: 'ex-uni',
      plannedExerciseId: 'pe-1',
      setNumber: 1,
      targetLoad: null,
      targetReps: null,
      targetRir: null,
      load: 28,
      reps: 9,
      rir: 2,
      durationSeconds: null,
      distanceMeters: null,
      completed: true,
      side: 'right',
      notes: null,
      createdAt: '2026-04-25T10:00:10Z',
      updatedAt: '2026-04-25T10:00:10Z',
    };

    const leftLog2: SetLog = {
      id: 'sl-left-2',
      sessionId: 'session-1',
      exerciseId: 'ex-uni',
      plannedExerciseId: 'pe-1',
      setNumber: 2,
      targetLoad: null,
      targetReps: null,
      targetRir: null,
      load: 32,
      reps: 11,
      rir: 2,
      durationSeconds: null,
      distanceMeters: null,
      completed: true,
      side: 'left',
      notes: null,
      createdAt: '2026-04-25T10:00:20Z',
      updatedAt: '2026-04-25T10:00:20Z',
    };

    setupStore('ex-uni', 3, [leftLog1, rightLog1, leftLog2]);
    render(<SessionLiveScreen />);

    // Après G1 + D1 + G2, la ligne courante est set 2 D — prefill doit montrer D1 (load=28, reps=9)
    await waitFor(() => screen.getByTestId('inline-load-input'));

    const loadInput = screen.getByTestId('inline-load-input');
    const repsInput = screen.getByTestId('inline-reps-input');
    expect(loadInput.props.value).toBe('28');
    expect(repsInput.props.value).toBe('9');
  });
});
