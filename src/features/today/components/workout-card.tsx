import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Clock, Dumbbell, Layers, Play } from 'lucide-react-native';
import { AppText, Button, Chip, SessionStatusBadge } from '@/components/ui';
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

/**
 * Hero de l'écran Aujourd'hui : la séance du jour mise en scène —
 * gradient volt, titre display, chips méta, aperçu des exercices, gros CTA.
 */
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

  const splitLabel = workoutDay.splitType
    ? SPLIT_LABELS[workoutDay.splitType] ?? workoutDay.splitType
    : null;

  return (
    <View
      className="rounded-card overflow-hidden bg-background-elevated"
      style={{ borderCurve: 'continuous' }}
    >
      <LinearGradient
        colors={['rgba(163, 230, 53, 0.18)', 'rgba(163, 230, 53, 0.06)', 'rgba(163, 230, 53, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <View className="p-5 gap-5">
        <View className="gap-2">
          <View className="flex-row items-center justify-between">
            <AppText variant="caption" className="text-accent font-bold uppercase" style={{ letterSpacing: 1.4 }}>
              Séance du jour
            </AppText>
            <SessionStatusBadge status={displayStatus} />
          </View>
          <AppText
            className="text-content-primary font-bold"
            style={{ fontSize: 27, lineHeight: 32, letterSpacing: -0.5 }}
          >
            {workoutDay.title}
          </AppText>
          <View className="flex-row flex-wrap gap-2">
            {splitLabel ? <Chip label={splitLabel} icon={Dumbbell} on="surface" /> : null}
            {workoutDay.estimatedDurationMin ? (
              <Chip label={`~${workoutDay.estimatedDurationMin} min`} icon={Clock} on="surface" />
            ) : null}
            <Chip
              label={`${plannedExercises.length} exercice${plannedExercises.length > 1 ? 's' : ''}`}
              icon={Layers}
              on="surface"
            />
          </View>
        </View>

        {isFirstSession ? (
          <AppText variant="body" muted>
            Première séance — on commence !
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
          <View className="gap-2.5">
            {plannedExercises.slice(0, 5).map((pe) => (
              <View key={pe.id} className="flex-row items-center gap-3">
                <View className="w-1.5 h-1.5 rounded-full bg-accent" />
                <AppText variant="body" className="flex-1" numberOfLines={1}>
                  {pe.exercise.nameFr ?? pe.exercise.name}
                </AppText>
                <AppText variant="caption" muted>
                  {pe.sets} × {pe.repRangeMin}–{pe.repRangeMax}
                </AppText>
              </View>
            ))}
            {plannedExercises.length > 5 ? (
              <AppText variant="caption" muted className="ml-4">
                +{plannedExercises.length - 5} autres
              </AppText>
            ) : null}
          </View>
        )}

        <Button
          label={isInProgress ? 'Reprendre la séance' : 'Démarrer la séance'}
          icon={Play}
          onPress={isInProgress ? onResume : onStart}
          variant="primary"
          size="lg"
          testID={isInProgress ? 'resume-session-button' : 'start-session-button'}
        />
      </View>
    </View>
  );
}
