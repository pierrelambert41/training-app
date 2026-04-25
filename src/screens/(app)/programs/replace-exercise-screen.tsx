import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { AppText, Button, EmptyState } from '@/components/ui';
import { colors } from '@/theme/tokens';
import {
  useAlternativeExercises,
  useReplaceExerciseMutation,
} from '@/hooks/use-replace-exercise';
import { useDebounce } from '@/hooks/use-debounce';
import type { Exercise } from '@/types';

function formatMuscles(muscles: string[]): string {
  return muscles
    .map((m) =>
      m
        .replace(/_/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    )
    .join(', ');
}

function formatMovementPattern(pattern: string): string {
  return pattern
    .replace(/_/g, ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

type CurrentExerciseHeaderProps = {
  name: string;
  muscles: string;
  movementPattern: string;
};

function CurrentExerciseHeader({ name, muscles, movementPattern }: CurrentExerciseHeaderProps) {
  return (
    <View className="px-4 pt-4 pb-5 bg-background-surface border-b border-border gap-2">
      <AppText variant="caption" muted className="uppercase font-semibold">
        Exercice actuel
      </AppText>
      <AppText variant="heading" className="font-semibold">
        {name}
      </AppText>
      {muscles.length > 0 && (
        <AppText variant="caption" muted>
          {muscles}
        </AppText>
      )}
      <View className="self-start px-2 py-0.5 rounded-chip bg-background-elevated border border-border-strong">
        <AppText variant="caption" className="text-content-secondary font-medium">
          {formatMovementPattern(movementPattern)}
        </AppText>
      </View>
    </View>
  );
}

type AlternativeRowProps = {
  exercise: Exercise;
  onSelect: (exercise: Exercise) => void;
};

function AlternativeRow({ exercise, onSelect }: AlternativeRowProps) {
  const displayName = exercise.nameFr ?? exercise.name;
  const muscles = formatMuscles(exercise.primaryMuscles);

  return (
    <Pressable
      onPress={() => onSelect(exercise)}
      className="flex-row items-center px-4 py-3 border-b border-border active:bg-background-elevated"
      style={{ minHeight: 44 }}
    >
      <View className="flex-1 gap-0.5">
        <AppText variant="body">{displayName}</AppText>
        {muscles.length > 0 && (
          <AppText variant="caption" muted numberOfLines={1}>
            {muscles}
          </AppText>
        )}
      </View>
      <AppText variant="caption" muted className="ml-3">
        ›
      </AppText>
    </Pressable>
  );
}

type ConfirmModalProps = {
  visible: boolean;
  currentName: string;
  selectedExercise: Exercise | null;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmModal({
  visible,
  currentName,
  selectedExercise,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!selectedExercise) return null;
  const newName = selectedExercise.nameFr ?? selectedExercise.name;
  const muscles = formatMuscles(selectedExercise.primaryMuscles);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/70 items-center justify-center px-6">
        <View className="w-full bg-background-surface rounded-card border border-border p-6 gap-5">
          <AppText variant="heading" className="font-semibold text-center">
            Confirmer le remplacement
          </AppText>

          <View className="gap-3">
            <View className="gap-1">
              <AppText variant="caption" muted>
                Remplacer
              </AppText>
              <AppText variant="body" className="font-medium">
                {currentName}
              </AppText>
            </View>

            <View className="flex-row items-center justify-center gap-2 py-1">
              <View className="flex-1 h-px bg-border" />
              <AppText variant="caption" muted>
                par
              </AppText>
              <View className="flex-1 h-px bg-border" />
            </View>

            <View className="gap-1 p-3 rounded-card bg-accent/10 border border-accent/30">
              <AppText variant="body" className="font-semibold text-accent">
                {newName}
              </AppText>
              {muscles.length > 0 && (
                <AppText variant="caption" muted>
                  {muscles}
                </AppText>
              )}
            </View>
          </View>

          <AppText variant="caption" muted className="text-center">
            Sets, reps, RIR et progression conservés.
          </AppText>

          <View className="gap-2">
            <Button
              label="Confirmer"
              onPress={onConfirm}
              loading={isPending}
              disabled={isPending}
            />
            <Button
              label="Annuler"
              onPress={onCancel}
              variant="secondary"
              disabled={isPending}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function ReplaceExerciseScreen() {
  const router = useRouter();
  const {
    plannedExerciseId,
    workoutDayId,
    currentExerciseId,
    currentExerciseName,
    currentExerciseNameFr,
    currentMovementPattern,
    currentPrimaryMuscles,
  } = useLocalSearchParams<{
    plannedExerciseId: string;
    workoutDayId: string;
    currentExerciseId: string;
    currentExerciseName: string;
    currentExerciseNameFr: string;
    currentMovementPattern: string;
    currentPrimaryMuscles: string;
  }>();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const displayName = currentExerciseNameFr || currentExerciseName || '';
  const primaryMuscles = currentPrimaryMuscles
    ? formatMuscles(currentPrimaryMuscles.split(','))
    : '';

  const movementPattern = currentMovementPattern ?? '';

  const { data: alternatives = [], isLoading } = useAlternativeExercises(
    movementPattern,
    currentExerciseId ?? '',
    debouncedSearch
  );

  const { mutate: replace, isPending } = useReplaceExerciseMutation(
    workoutDayId ?? ''
  );

  const handleSelectExercise = useCallback((exercise: Exercise) => {
    setSelectedExercise(exercise);
    setConfirmVisible(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (!selectedExercise || !plannedExerciseId) return;
    replace(
      {
        plannedExerciseId,
        newExerciseId: selectedExercise.id,
      },
      {
        onSuccess: () => {
          setConfirmVisible(false);
          router.back();
        },
        onError: () => {
          setConfirmVisible(false);
          Alert.alert(
            'Erreur',
            "Le remplacement a échoué. Vérifie ta connexion et réessaie.",
          );
        },
      }
    );
  }, [selectedExercise, plannedExerciseId, replace, router]);

  const handleCancel = useCallback(() => {
    setConfirmVisible(false);
    setSelectedExercise(null);
  }, []);

  if (!plannedExerciseId || !workoutDayId || !currentExerciseId) {
    return (
      <View className="flex-1 bg-background p-4 justify-center">
        <EmptyState
          title="Données manquantes"
          description="Impossible d'ouvrir le remplacement. Retourne en arrière."
        />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <CurrentExerciseHeader
        name={displayName}
        muscles={primaryMuscles}
        movementPattern={movementPattern}
      />

      <View className="px-4 pt-4 pb-2">
        <TextInput
          className="bg-background-surface border border-border rounded-button h-tap px-4 text-body text-content-primary"
          placeholderTextColor={colors.contentMuted}
          placeholder="Rechercher une alternative…"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <View className="px-4 pb-2">
        <AppText variant="caption" muted className="uppercase font-semibold">
          Alternatives recommandées
        </AppText>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : alternatives.length === 0 ? (
        <View className="flex-1 p-4">
          <EmptyState
            title="Aucune alternative"
            description={
              searchQuery.length > 0
                ? 'Aucun exercice ne correspond à votre recherche avec votre matériel.'
                : 'Aucune alternative compatible trouvée pour ce pattern avec votre matériel.'
            }
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="bg-background-surface border-y border-border">
            {alternatives.map((ex) => (
              <AlternativeRow
                key={ex.id}
                exercise={ex}
                onSelect={handleSelectExercise}
              />
            ))}
          </View>
          <View className="h-8" />
        </ScrollView>
      )}

      <ConfirmModal
        visible={confirmVisible}
        currentName={displayName}
        selectedExercise={selectedExercise}
        isPending={isPending}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </View>
  );
}
