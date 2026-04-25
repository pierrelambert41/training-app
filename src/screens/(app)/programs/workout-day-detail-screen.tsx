import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppText, Button, EmptyState } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { useWorkoutDayDetail, type PlannedExerciseWithExercise } from '@/hooks/use-workout-day-detail';
import type { PlannedExerciseRole } from '@/types/planned-exercise';

const SPLIT_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full: 'Full Body',
};

const ROLE_CONFIG: Record<
  PlannedExerciseRole,
  { label: string; containerClass: string; textClass: string }
> = {
  main: {
    label: 'Principal',
    containerClass: 'bg-accent/20 border border-accent/40',
    textClass: 'text-accent',
  },
  secondary: {
    label: 'Secondaire',
    containerClass: 'bg-status-warning/20 border border-status-warning/40',
    textClass: 'text-status-warning',
  },
  accessory: {
    label: 'Accessoire',
    containerClass: 'bg-background-elevated border border-border-strong',
    textClass: 'text-content-secondary',
  },
};

function RoleBadge({ role }: { role: PlannedExerciseRole }) {
  const config = ROLE_CONFIG[role];
  return (
    <View className={`self-start px-2 py-0.5 rounded-chip ${config.containerClass}`}>
      <AppText variant="caption" className={`font-semibold uppercase ${config.textClass}`}>
        {config.label}
      </AppText>
    </View>
  );
}

function resolveTargetLoad(pe: PlannedExerciseWithExercise): string {
  if (pe.progressionConfig === null || typeof pe.progressionConfig !== 'object') {
    return 'À calibrer';
  }
  const config = pe.progressionConfig as Record<string, unknown>;
  const target = config['target_load'];
  if (typeof target === 'number') return `${target} kg`;

  const targetMin = config['target_load_min'];
  const targetMax = config['target_load_max'];
  if (typeof targetMin === 'number' && typeof targetMax === 'number') {
    return `${targetMin}–${targetMax} kg`;
  }

  return 'À calibrer';
}

function formatMuscles(muscles: string[]): string {
  return muscles
    .map((m) =>
      m
        .replace(/_/g, ' ')
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(', ');
}

type StatChipProps = {
  label: string;
  value: string;
  prominent?: boolean;
};

function StatChip({ label, value, prominent = false }: StatChipProps) {
  return (
    <View className="items-center gap-0.5">
      <AppText
        className={
          prominent
            ? 'text-logger text-content-primary font-bold leading-none'
            : 'text-heading text-content-primary font-semibold leading-none'
        }
      >
        {value}
      </AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

type PlannedExerciseCardProps = {
  item: PlannedExerciseWithExercise;
  onExercisePress: (exerciseId: string) => void;
  onReplacePress: (pe: PlannedExerciseWithExercise) => void;
};

function PlannedExerciseCard({ item, onExercisePress, onReplacePress }: PlannedExerciseCardProps) {
  const { exercise } = item;
  const displayName = exercise.nameFr ?? exercise.name;
  const primaryMuscles = formatMuscles(exercise.primaryMuscles);
  const targetLoad = resolveTargetLoad(item);
  const repRange =
    item.repRangeMin === item.repRangeMax
      ? `${item.repRangeMin}`
      : `${item.repRangeMin}–${item.repRangeMax}`;

  return (
    <View className="bg-background-surface border border-border rounded-card overflow-hidden">
      <View className="px-4 pt-4 pb-3 gap-3">
        <View className="flex-row items-start justify-between gap-2">
          <Pressable
            onPress={() => onExercisePress(exercise.id)}
            className="flex-1 gap-1 active:opacity-70"
            style={{ minHeight: 44 }}
          >
            <AppText variant="heading" className="font-semibold leading-snug">
              {displayName}
            </AppText>
            {primaryMuscles.length > 0 && (
              <AppText variant="caption" muted>
                {primaryMuscles}
              </AppText>
            )}
          </Pressable>

          <RoleBadge role={item.role} />
        </View>

        <View className="flex-row items-center justify-between gap-2 py-3 px-2 bg-background-elevated rounded-card">
          <StatChip label="Charge" value={targetLoad} prominent />
          <View className="w-px h-8 bg-border" />
          <StatChip label="Reps" value={repRange} prominent />
          <View className="w-px h-8 bg-border" />
          <StatChip label="Séries" value={`${item.sets}×`} />
          {item.targetRir !== null && (
            <>
              <View className="w-px h-8 bg-border" />
              <StatChip label="RIR" value={`${item.targetRir}`} />
            </>
          )}
        </View>

        {(item.restSeconds !== null || item.tempo !== null) && (
          <View className="flex-row gap-4">
            {item.restSeconds !== null && (
              <View className="flex-row items-center gap-1">
                <AppText variant="caption" muted>
                  Repos :
                </AppText>
                <AppText variant="caption" className="text-content-primary font-medium">
                  {item.restSeconds >= 60
                    ? `${Math.floor(item.restSeconds / 60)} min${item.restSeconds % 60 > 0 ? ` ${item.restSeconds % 60}s` : ''}`
                    : `${item.restSeconds}s`}
                </AppText>
              </View>
            )}
            {item.tempo !== null && (
              <View className="flex-row items-center gap-1">
                <AppText variant="caption" muted>
                  Tempo :
                </AppText>
                <AppText variant="caption" className="text-content-primary font-medium">
                  {item.tempo}
                </AppText>
              </View>
            )}
          </View>
        )}
      </View>

      <Pressable
        onPress={() => onReplacePress(item)}
        className="border-t border-border px-4 py-3 active:bg-background-elevated"
        style={{ minHeight: 44 }}
      >
        <AppText variant="caption" className="text-content-secondary text-center font-medium">
          Remplacer cet exercice
        </AppText>
      </Pressable>
    </View>
  );
}

type DayHeaderProps = {
  title: string;
  splitType: string | null;
  estimatedDurationMin: number | null;
};

function DayHeader({ title, splitType, estimatedDurationMin }: DayHeaderProps) {
  return (
    <View className="px-4 pt-4 pb-5 bg-background-surface border-b border-border gap-1">
      <AppText variant="heading" className="font-semibold">
        {title}
      </AppText>
      <View className="flex-row items-center gap-2">
        {splitType && (
          <AppText variant="caption">
            {SPLIT_LABELS[splitType] ?? splitType}
          </AppText>
        )}
        {splitType && estimatedDurationMin && (
          <AppText variant="caption" muted>
            ·
          </AppText>
        )}
        {estimatedDurationMin && (
          <AppText variant="caption">~{estimatedDurationMin} min</AppText>
        )}
      </View>
    </View>
  );
}

export default function WorkoutDayDetailScreen() {
  const { workoutDayId, programId } = useLocalSearchParams<{
    workoutDayId: string;
    programId: string;
  }>();
  const router = useRouter();
  const { data, isLoading, error } = useWorkoutDayDetail(workoutDayId ?? '');

  function handleExercisePress(_exerciseId: string) {
    // TODO TA-XX: route exercise detail pas encore implémentée
  }

  function handleReplacePress(pe: PlannedExerciseWithExercise) {
    router.push({
      pathname: '/(app)/programs/[programId]/day/replace-exercise',
      params: {
        programId: programId ?? '',
        plannedExerciseId: pe.id,
        workoutDayId: workoutDayId ?? '',
        currentExerciseId: pe.exercise.id,
        currentExerciseName: pe.exercise.name,
        currentExerciseNameFr: pe.exercise.nameFr ?? '',
        currentMovementPattern: pe.exercise.movementPattern,
        currentPrimaryMuscles: pe.exercise.primaryMuscles.join(','),
      },
    });
  }

  function handleStartSession() {
    if (!workoutDayId) return;
    router.push(`/(app)/session/start?workoutDayId=${workoutDayId}` as Parameters<typeof router.push>[0]);
  }

  if (!workoutDayId) {
    return (
      <View className="flex-1 bg-background p-4 justify-center">
        <EmptyState
          title="Séance introuvable"
          description="Identifiant de séance manquant. Retourne en arrière et réessaie."
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View className="flex-1 bg-background p-4 justify-center">
        <EmptyState
          title="Séance introuvable"
          description="Impossible de charger cette séance. Retourne en arrière et réessaie."
        />
      </View>
    );
  }

  const { day, plannedExercises } = data;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-40"
        showsVerticalScrollIndicator={false}
      >
        <DayHeader
          title={day.title}
          splitType={day.splitType}
          estimatedDurationMin={day.estimatedDurationMin}
        />

        <View className="px-4 pt-5 gap-3">
          <AppText variant="caption" muted>
            EXERCICES — {plannedExercises.length}
          </AppText>

          {plannedExercises.length === 0 ? (
            <EmptyState
              title="Aucun exercice"
              description="Cette séance ne contient pas encore d'exercices."
            />
          ) : (
            plannedExercises.map((pe) => (
              <PlannedExerciseCard
                key={pe.id}
                item={pe}
                onExercisePress={handleExercisePress}
                onReplacePress={handleReplacePress}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-4 bg-background border-t border-border">
        <Button
          label="Démarrer cette séance"
          onPress={handleStartSession}
          size="lg"
        />
      </View>
    </View>
  );
}
