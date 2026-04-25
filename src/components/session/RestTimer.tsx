import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { useSessionStore } from '@/stores/session-store';
import { AppText } from '@/components/ui';

const REST_TIMER_READY_DISPLAY_MS = 5000;

function formatMmSs(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  const s = Math.max(0, totalSeconds) % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timerColor(remainingSeconds: number): string {
  if (remainingSeconds > 30) return '#3b82f6';
  if (remainingSeconds > 10) return '#f97316';
  return '#ef4444';
}

async function playShortBeep(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false, // intentional: respect iOS silent switch
    });
    const { sound } = await Audio.Sound.createAsync(
      require('@/assets/sounds/beep.mp3'),
      { shouldPlay: true, volume: 1 }
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        sound.unloadAsync();
      }
    });
  } catch {
    // silence if unavailable or phone in silent mode
  }
}

async function triggerHapticFeedback(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }
}

export function RestTimer() {
  const restTimer = useSessionStore((s) => s.restTimer);
  const skipRestTimer = useSessionStore((s) => s.skipRestTimer);

  const [remaining, setRemaining] = useState<number | null>(null);
  const [showReady, setShowReady] = useState(false);
  const readyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didFireRef = useRef(false);

  useEffect(() => {
    if (!restTimer) {
      setRemaining(null);
      setShowReady(false);
      didFireRef.current = false;
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
        readyTimeoutRef.current = null;
      }
      return;
    }

    didFireRef.current = false;
    setShowReady(false);

    let intervalId: ReturnType<typeof setInterval>;

    function tick() {
      if (!restTimer) return;
      const elapsed = (Date.now() - restTimer.startedAt) / 1000;
      const rem = Math.ceil(restTimer.durationSec - elapsed);

      if (rem <= 0) {
        setRemaining(0);
        clearInterval(intervalId);

        if (!didFireRef.current) {
          didFireRef.current = true;
          triggerHapticFeedback();
          playShortBeep();
          setShowReady(true);

          readyTimeoutRef.current = setTimeout(() => {
            setShowReady(false);
            setRemaining(null);
          }, REST_TIMER_READY_DISPLAY_MS);
        }
        return;
      }

      setRemaining(rem);
    }

    tick();
    intervalId = setInterval(tick, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [restTimer]);

  useEffect(() => {
    return () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
      }
    };
  }, []);

  const handleSkip = useCallback(() => {
    if (readyTimeoutRef.current) {
      clearTimeout(readyTimeoutRef.current);
      readyTimeoutRef.current = null;
    }
    setShowReady(false);
    setRemaining(null);
    skipRestTimer();
  }, [skipRestTimer]);

  if (remaining === null && !showReady) {
    return null;
  }

  if (showReady) {
    return (
      <View
        className="flex-row items-center justify-between px-4 py-3 bg-status-success"
        testID="rest-timer-ready"
      >
        <AppText className="text-label font-semibold text-content-on-accent flex-1">
          Prêt
        </AppText>
        <Pressable
          onPress={handleSkip}
          hitSlop={8}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          accessibilityLabel="Fermer le timer de repos"
          testID="rest-timer-skip"
        >
          <AppText className="text-label font-semibold text-content-on-accent">
            ✕
          </AppText>
        </Pressable>
      </View>
    );
  }

  const rem = remaining ?? 0;
  const color = timerColor(rem);

  return (
    <View
      className="flex-row items-center justify-between px-4 py-3 bg-background-elevated border-b border-border"
      testID="rest-timer-banner"
    >
      <AppText className="text-label text-content-secondary">
        Repos
      </AppText>

      <AppText
        className="text-heading font-bold"
        style={{ color, fontVariant: ['tabular-nums'] }}
        testID="rest-timer-countdown"
      >
        {formatMmSs(rem)}
      </AppText>

      <Pressable
        onPress={handleSkip}
        hitSlop={8}
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        accessibilityLabel="Passer le repos"
        testID="rest-timer-skip"
      >
        <AppText className="text-label font-semibold text-content-muted">
          Skip
        </AppText>
      </Pressable>
    </View>
  );
}
