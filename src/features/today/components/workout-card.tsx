import { View } from 'react-native';
import { Card, AppText, Button, SessionStatusBadge } from '@/components/ui';
import type { TodayWorkoutData } from '@/hooks/use-today-workout';
import type { TodayRecommendations } from '../types/today-recommendations';
import { ExerciseLoadRow } from './exercise-load-row';

const SPLIT_LABELS: Record<string, string> = {
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  upper: 'Upper',
  lower: 'Lower',
  full: 'Full Body',
};

type Props = {
  data: TodayWorkoutData;
  recommendations: TodayRecommendations | null;
  isInProgress: boolean;
  onStart: () => void;
  onResume: () => void;
};

export function WorkoutCard({ data, recommendations, isInProgress, onStart, onResume }: Props) {
  const { workoutDay, plannedExercises } = data;

  const displayStatus = recommendations?.sessionStatus ?? data.sessionStatus;

  const exercisesById = new Map(plannedExercises.map((pe) => [pe.exerciseId, pe.exercise]));

  const loadRecs = recommendations?.loadRecommendations ?? [];
  const hasLoadRecs = loadRecs.length > 0;

  const isFirstSession = !recommendations || (
    recommendations.loadRecommendations.length === 0 &&
    recommendations.plateauRecommendations.length === 0 &&
    recommendations.deloadRecommendation === null &&
    recommendations.sessionStatus === null
  );

  return (
    <Card elevation="elevated" className="gap-3">
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-1 gap-1">
          <AppText variant="heading">{workoutDay.title}</AppText>
          {workoutDay.splitType ? (
            <AppText variant="caption" muted>
              {SPLIT_LABELS[workoutDay.splitType] ?? workoutDay.splitType}
            </AppText>
          ) : null}
          {workoutDay.estimatedDurationMin ? (
            <AppText variant="caption" muted>{workoutDay.estimatedDurationMin} min</AppText>
          ) : null}
        </View>
        <SessionStatusBadge status={displayStatus} />
      </View>

      {isFirstSession ? (
        <AppText variant="body" muted className="text-center py-2">
          Premiere seance — on commence !
        </AppText>
      ) : hasLoadRecs ? (
        <View className="gap-0">
          {loadRecs.slice(0, 5).map((rec) => {
            const exercise = exercisesById.get(rec.exerciseId ?? '');
            const name = exercise?.nameFr ?? exercise?.name ?? rec.exerciseId ?? '?';
            return (
              <ExerciseLoadRow
                key={rec.id}
                exerciseName={name}
                nextLoad={rec.nextLoad}
                action={rec.action}
              />
            );
          })}
          {loadRecs.length > 5 ? (
            <AppText variant="caption" muted>+{loadRecs.length - 5} autres exercices</AppText>
          ) : null}
        </View>
      ) : (
        <View className="gap-2 mt-1">
          {plannedExercises.slice(0, 5).map((pe) => (
            <View key={pe.id} className="flex-row items-center justify-between">
              <AppText variant="body" className="flex-1 mr-2" numberOfLines={1}>
                {pe.exercise.nameFr ?? pe.exercise.name}
              </AppText>
              <AppText variant="caption" muted>
                {pe.sets} x {pe.repRangeMin}–{pe.repRangeMax}
              </AppText>
            </View>
          ))}
          {plannedExercises.length > 5 ? (
            <AppText variant="caption" muted>+{plannedExercises.length - 5} autres</AppText>
          ) : null}
        </View>
      )}

      <Button
        label={isInProgress ? 'Reprendre la seance' : 'Demarrer la seance'}
        onPress={isInProgress ? onResume : onStart}
        variant="primary"
        size="lg"
        testID={isInProgress ? 'resume-session-button' : 'start-session-button'}
      />
    </Card>
  );
}
