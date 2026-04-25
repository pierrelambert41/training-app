import React from 'react';
import { act, render, fireEvent } from '@testing-library/react-native';
import { RestTimer } from './RestTimer';
import { useSessionStore } from '@/stores/session-store';

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    Sound: {
      createAsync: jest.fn().mockResolvedValue({
        sound: {
          setOnPlaybackStatusUpdate: jest.fn(),
          unloadAsync: jest.fn(),
        },
      }),
    },
  },
}));

jest.mock('@/stores/session-store', () => ({
  useSessionStore: jest.fn(),
}));

const mockUseSessionStore = useSessionStore as jest.MockedFunction<typeof useSessionStore>;

type SessionStoreState = Parameters<typeof useSessionStore>[0] extends (state: infer S) => unknown ? S : never;

function setupStore(overrides: Partial<ReturnType<typeof useSessionStore>> = {}) {
  const skipRestTimer = jest.fn().mockResolvedValue(undefined);
  mockUseSessionStore.mockImplementation((selector: (state: SessionStoreState) => unknown) => {
    const state = {
      restTimer: null,
      skipRestTimer,
      ...overrides,
    } as SessionStoreState;
    return selector(state);
  });
  return { skipRestTimer };
}

describe('RestTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders nothing when restTimer is null', () => {
    setupStore({ restTimer: null });
    const { queryByTestId } = render(<RestTimer />);
    expect(queryByTestId('rest-timer-banner')).toBeNull();
  });

  it('renders the countdown banner when restTimer is active', () => {
    setupStore({
      restTimer: {
        startedAt: Date.now(),
        durationSec: 90,
        notificationId: null,
        exerciseName: 'Squat',
      },
    });

    const { getByTestId } = render(<RestTimer />);
    expect(getByTestId('rest-timer-banner')).toBeTruthy();
    expect(getByTestId('rest-timer-countdown')).toBeTruthy();
  });

  it('displays mm:ss format for the countdown', () => {
    setupStore({
      restTimer: {
        startedAt: Date.now(),
        durationSec: 90,
        notificationId: null,
        exerciseName: 'Squat',
      },
    });

    const { getByTestId } = render(<RestTimer />);
    const countdown = getByTestId('rest-timer-countdown');
    expect(countdown.props.children).toMatch(/^\d{2}:\d{2}$/);
  });

  it('calls skipRestTimer when Skip is pressed', () => {
    const { skipRestTimer } = setupStore({
      restTimer: {
        startedAt: Date.now(),
        durationSec: 90,
        notificationId: null,
        exerciseName: 'Squat',
      },
    });

    const { getByTestId } = render(<RestTimer />);
    fireEvent.press(getByTestId('rest-timer-skip'));
    expect(skipRestTimer).toHaveBeenCalledTimes(1);
  });

  it('shows "Prêt" when timer reaches zero', async () => {
    const startedAt = Date.now() - 90_000;
    setupStore({
      restTimer: {
        startedAt,
        durationSec: 90,
        notificationId: null,
        exerciseName: 'Squat',
      },
    });

    const { getByTestId } = render(<RestTimer />);

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    expect(getByTestId('rest-timer-ready')).toBeTruthy();
  });

  it('disappears after 5s in "Prêt" state', async () => {
    const startedAt = Date.now() - 90_000;
    setupStore({
      restTimer: {
        startedAt,
        durationSec: 90,
        notificationId: null,
        exerciseName: 'Squat',
      },
    });

    const { queryByTestId } = render(<RestTimer />);

    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(queryByTestId('rest-timer-ready')).toBeNull();
    expect(queryByTestId('rest-timer-banner')).toBeNull();
  });
});
