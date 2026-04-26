import { useEffect, useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { generateUUID } from '@/utils/uuid';
import { useDB } from '@/hooks/use-db';
import { useAuthStore } from '@/features/auth';
import { useSessionStore } from '@/stores/session-store';
import { getInProgressSessionForWorkoutDay } from '@/services/sessions';
import { AppText, Button, Card } from '@/components/ui';

type ReadinessField = 'energy' | 'sleepQuality' | 'motivation';

const READINESS_LABELS: Record<ReadinessField, string> = {
  energy: 'Énergie',
  sleepQuality: 'Sommeil',
  motivation: 'Motivation',
};

type ReadinessValues = Record<ReadinessField, number>;

function ReadinessStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <AppText variant="body" className="font-medium">
          {label}
        </AppText>
        <AppText variant="heading" className="text-accent w-8 text-right">
          {value}
        </AppText>
      </View>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          className="w-tap h-tap items-center justify-center rounded-button bg-background-surface border border-border active:opacity-70"
          hitSlop={8}
          accessibilityLabel={`Diminuer ${label}`}
        >
          <AppText variant="heading" className="text-content-primary">
            −
          </AppText>
        </Pressable>

        <View className="flex-1 h-2 bg-background-surface rounded-chip overflow-hidden">
          <View
            className="h-full bg-accent rounded-chip"
            style={{ width: `${(value / 10) * 100}%` }}
          />
        </View>

        <Pressable
          onPress={() => onChange(Math.min(10, value + 1))}
          className="w-tap h-tap items-center justify-center rounded-button bg-background-surface border border-border active:opacity-70"
          hitSlop={8}
          accessibilityLabel={`Augmenter ${label}`}
        >
          <AppText variant="heading" className="text-content-primary">
            +
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

export default function SessionStartScreen() {
  const router = useRouter();
  const { workoutDayId } = useLocalSearchParams<{ workoutDayId: string }>();
  const db = useDB();
  const user = useAuthStore((s) => s.user);
  const startSession = useSessionStore((s) => s.startSession);

  const [readiness, setReadiness] = useState<ReadinessValues>({
    energy: 7,
    sleepQuality: 7,
    motivation: 7,
  });
  const [isStarting, setIsStarting] = useState(false);
  const [redirectChecked, setRedirectChecked] = useState(false);

  useEffect(() => {
    if (!workoutDayId) {
      setRedirectChecked(true);
      return;
    }
    getInProgressSessionForWorkoutDay(db, workoutDayId)
      .then((existing) => {
        if (existing) {
          router.replace('/(app)/session/live');
        } else {
          setRedirectChecked(true);
        }
      })
      .catch(() => setRedirectChecked(true));
  }, [workoutDayId, db, router]);

  async function handleStart(withReadiness: boolean) {
    if (!user || isStarting) return;
    setIsStarting(true);

    const today = new Date().toISOString().slice(0, 10);
    const sessionId = generateUUID();

    await startSession(db, {
      sessionId,
      userId: user.id,
      workoutDayId: workoutDayId ?? null,
      blockId: null,
      date: today,
      energy: withReadiness ? readiness.energy : null,
      sleepQuality: withReadiness ? readiness.sleepQuality : null,
      motivation: withReadiness ? readiness.motivation : null,
    });

    router.replace('/(app)/session/live');
  }

  if (!redirectChecked) {
    return null;
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow justify-between px-4 pt-6 pb-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-6">
        <View className="gap-1">
          <AppText className="text-display text-content-primary font-bold">
            Comment tu te sens ?
          </AppText>
          <AppText variant="body" className="text-content-secondary">
            Évalue ton état avant de commencer.
          </AppText>
        </View>

        <Card elevation="elevated" className="gap-6">
          {(Object.keys(READINESS_LABELS) as ReadinessField[]).map((field) => (
            <ReadinessStepper
              key={field}
              label={READINESS_LABELS[field]}
              value={readiness[field]}
              onChange={(next) =>
                setReadiness((prev) => ({ ...prev, [field]: next }))
              }
            />
          ))}
        </Card>
      </View>

      <View className="gap-3 mt-8">
        <Button
          label="Démarrer la séance"
          onPress={() => handleStart(true)}
          variant="primary"
          size="lg"
          loading={isStarting}
          testID="start-session-button"
        />
        <Button
          label="Passer"
          onPress={() => handleStart(false)}
          variant="ghost"
          size="md"
          disabled={isStarting}
          testID="skip-readiness-button"
        />
      </View>
    </ScrollView>
  );
}
