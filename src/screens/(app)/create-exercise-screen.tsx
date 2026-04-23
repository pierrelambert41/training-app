import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { v4 as uuidv4 } from 'uuid';
import { useAuthStore } from '@/stores/auth-store';
import { useCreateExercise } from '@/hooks/use-create-exercise';
import { Button, Input, MultiSelect } from '@/components/ui';
import { EQUIPMENT_OPTIONS, MOVEMENT_PATTERN_OPTIONS, MUSCLE_OPTIONS } from '@/constants/exercise-options';
import { AppText } from '@/components/ui/text';
import type { MovementPattern } from '@/types';

type FormErrors = {
  name?: string;
  primaryMuscles?: string;
  movementPattern?: string;
};

function validateForm(name: string, primaryMuscles: string[], movementPattern: string | null): FormErrors {
  const errors: FormErrors = {};
  if (name.trim().length === 0) {
    errors.name = 'Le nom est requis.';
  } else if (name.trim().length < 2) {
    errors.name = 'Le nom doit contenir au moins 2 caractères.';
  }
  if (primaryMuscles.length === 0) {
    errors.primaryMuscles = 'Sélectionnez au moins un muscle primaire.';
  }
  if (!movementPattern) {
    errors.movementPattern = 'Sélectionnez un patron de mouvement.';
  }
  return errors;
}

export default function CreateExerciseScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { mutate: createExercise, isPending } = useCreateExercise();

  const [name, setName] = useState('');
  const [movementPattern, setMovementPattern] = useState<MovementPattern | null>(null);
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [secondaryMuscles, setSecondaryMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  function toggleMovementPattern(pattern: string) {
    const typed = pattern as MovementPattern;
    setMovementPattern((prev) => (prev === typed ? null : typed));
    if (errors.movementPattern) setErrors((e) => ({ ...e, movementPattern: undefined }));
  }

  function togglePrimary(muscle: string) {
    setPrimaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  }

  function toggleSecondary(muscle: string) {
    setSecondaryMuscles((prev) =>
      prev.includes(muscle) ? prev.filter((m) => m !== muscle) : [...prev, muscle]
    );
  }

  function toggleEquipment(item: string) {
    setEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  }

  function handleSubmit() {
    if (!user) {
      Alert.alert('Erreur', 'Vous devez être connecté pour créer un exercice.');
      return;
    }

    const validationErrors = validateForm(name, primaryMuscles, movementPattern);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});

    createExercise(
      {
        id: uuidv4(),
        name: name.trim(),
        movementPattern: movementPattern!,
        primaryMuscles,
        secondaryMuscles,
        equipment,
        notes: notes.trim().length > 0 ? notes.trim() : null,
        createdBy: user.id,
      },
      {
        onSuccess: () => {
          router.back();
        },
        onError: () => {
          Alert.alert('Erreur', "Impossible de sauvegarder l'exercice. Réessayez.");
        },
      }
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      testID="create-exercise-screen"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-8 gap-6"
        keyboardShouldPersistTaps="handled"
      >
        <Input
          label="Nom *"
          value={name}
          onChangeText={(text) => {
            setName(text);
            if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
          }}
          placeholder="Ex : Curl marteau incliné"
          autoCapitalize="sentences"
          error={errors.name}
          testID="create-exercise-name-input"
        />

        <View className="gap-1">
          <MultiSelect
            label="Patron de mouvement *"
            options={MOVEMENT_PATTERN_OPTIONS}
            selected={movementPattern ? [movementPattern] : []}
            onToggle={toggleMovementPattern}
            testID="create-exercise-movement-pattern"
          />
          {errors.movementPattern ? (
            <AppText variant="caption" className="text-status-danger">
              {errors.movementPattern}
            </AppText>
          ) : null}
        </View>

        <View className="gap-1">
          <MultiSelect
            label="Muscles primaires *"
            options={MUSCLE_OPTIONS}
            selected={primaryMuscles}
            onToggle={togglePrimary}
            testID="create-exercise-primary-muscles"
          />
          {errors.primaryMuscles ? (
            <AppText variant="caption" className="text-status-danger">
              {errors.primaryMuscles}
            </AppText>
          ) : null}
        </View>

        <MultiSelect
          label="Muscles secondaires"
          options={MUSCLE_OPTIONS}
          selected={secondaryMuscles}
          onToggle={toggleSecondary}
          testID="create-exercise-secondary-muscles"
        />

        <MultiSelect
          label="Équipement"
          options={EQUIPMENT_OPTIONS}
          selected={equipment}
          onToggle={toggleEquipment}
          testID="create-exercise-equipment"
        />

        <Input
          label="Notes"
          value={notes}
          onChangeText={setNotes}
          placeholder="Indications techniques, variantes…"
          autoCapitalize="sentences"
          multiline
          numberOfLines={3}
          testID="create-exercise-notes-input"
        />

        <Button
          label={isPending ? 'Sauvegarde\u2026' : "Cr\u00e9er l'exercice"}
          onPress={handleSubmit}
          loading={isPending}
          disabled={isPending}
          size="lg"
          testID="create-exercise-submit"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
