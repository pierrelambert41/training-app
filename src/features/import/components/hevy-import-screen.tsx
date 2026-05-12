import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useHevyImport } from '../hooks/use-hevy-import';
import { StepFileSelection } from './step-file-selection';
import { StepExerciseMapping } from './step-exercise-mapping';
import { StepConfirmation } from './step-confirmation';

const STEP_LABELS: Record<string, string> = {
  file_selection: 'Sélection',
  exercise_mapping: 'Exercices',
  confirmation: 'Confirmation',
};

const STEP_NUMBERS: Record<string, number> = {
  file_selection: 1,
  exercise_mapping: 2,
  confirmation: 3,
};

const TOTAL_STEPS = 3;

export function HevyImportScreen() {
  const router = useRouter();
  const {
    state,
    fileError,
    pickFile,
    updateMapping,
    toggleIgnore,
    goToMapping,
    goToConfirmation,
    goBack,
    reset,
    unmappedCount,
    importSessions,
  } = useHevyImport();

  const [isPicking, setIsPicking] = useState(false);

  async function handlePickFile() {
    setIsPicking(true);
    await pickFile();
    setIsPicking(false);
  }

  async function handleConfirm() {
    await importSessions();
  }

  const currentStep = STEP_NUMBERS[state.step] ?? 1;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Pressable
          onPress={() => {
            if (state.step === 'file_selection') {
              router.back();
            } else {
              goBack();
            }
          }}
          style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
          accessibilityLabel="Retour"
        >
          <Text className="text-body text-accent font-medium">‹ Retour</Text>
        </Pressable>

        <Text className="text-caption text-content-muted">
          Étape {currentStep}/{TOTAL_STEPS} — {STEP_LABELS[state.step]}
        </Text>

        <Pressable
          onPress={reset}
          style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
          accessibilityLabel="Annuler"
        >
          <Text className="text-body text-content-muted font-medium">Annuler</Text>
        </Pressable>
      </View>

      <View className="h-1 bg-background-surface">
        <View
          className="h-full bg-accent"
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        />
      </View>

      {state.step === 'file_selection' ? (
        <StepFileSelection
          fileName={state.fileName}
          fileError={fileError}
          hasData={state.parsedData !== null}
          isPicking={isPicking}
          onPickFile={handlePickFile}
          onNext={goToMapping}
        />
      ) : null}

      {state.step === 'exercise_mapping' && state.parsedData ? (
        <StepExerciseMapping
          mappings={state.exerciseMappings}
          warnings={state.parsedData.warnings.length}
          unmappedCount={unmappedCount}
          onUpdateMapping={updateMapping}
          onToggleIgnore={toggleIgnore}
          onNext={goToConfirmation}
          onBack={goBack}
        />
      ) : null}

      {state.step === 'confirmation' && state.parsedData ? (
        <StepConfirmation
          parsedData={state.parsedData}
          mappings={state.exerciseMappings}
          onConfirm={handleConfirm}
          onBack={goBack}
        />
      ) : null}
    </SafeAreaView>
  );
}
