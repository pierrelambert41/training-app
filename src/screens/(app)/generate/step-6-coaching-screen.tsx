import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useGenerationStore } from '@/stores/generation-store';
import {
  AppText,
  CardChoice,
  Input,
  SegmentedControl,
  StepLayout,
} from '@/components/ui';
import { PRIORITY_MUSCLE_OPTIONS } from '@/types/generation';
import type { GenerationAnswers, VolumeToleranceLevel, MixedPriority } from '@/types/generation';

const DURATION_OPTIONS: { value: NonNullable<GenerationAnswers['maxSessionDurationMin']>; label: string }[] = [
  { value: 45, label: '45 min' },
  { value: 60, label: '60 min' },
  { value: 75, label: '75 min' },
  { value: 90, label: '90 min' },
];

const VOLUME_OPTIONS: { value: VolumeToleranceLevel; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
];

const MIXED_PRIORITY_OPTIONS: { value: MixedPriority; label: string }[] = [
  { value: 'strength', label: 'Force' },
  { value: 'look', label: 'Look' },
];

export default function Step6CoachingScreen() {
  const router = useRouter();
  const answers = useGenerationStore((s) => s.answers);
  const setPriorityMuscles = useGenerationStore((s) => s.setPriorityMuscles);
  const setSportsParallel = useGenerationStore((s) => s.setSportsParallel);
  const setMaxSessionDuration = useGenerationStore((s) => s.setMaxSessionDuration);
  const setMixedPriority = useGenerationStore((s) => s.setMixedPriority);
  const setVolumeTolerance = useGenerationStore((s) => s.setVolumeTolerance);

  const isValid =
    answers.maxSessionDurationMin !== null && answers.volumeTolerance !== null;

  function toggleMuscle(muscle: string) {
    const current = answers.priorityMuscles;
    if (current.includes(muscle)) {
      setPriorityMuscles(current.filter((m) => m !== muscle));
    } else {
      setPriorityMuscles([...current, muscle]);
    }
  }

  function handleNext() {
    router.push('/(app)/programs/generate/step-7-advanced');
  }

  function handleBack() {
    router.back();
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StepLayout
        step={6}
        title="Questionnaire de coaching"
        subtitle="Ces réponses affinent la structure de ton programme."
        onNext={handleNext}
        onBack={handleBack}
        nextDisabled={!isValid}
      >
        <View className="gap-6">
          <View className="gap-3">
            <AppText variant="caption" className="text-content-secondary uppercase tracking-wider">
              Durée max par séance *
            </AppText>
            <View className="gap-2">
              {DURATION_OPTIONS.map((opt) => (
                <CardChoice
                  key={opt.value}
                  label={opt.label}
                  selected={answers.maxSessionDurationMin === opt.value}
                  onPress={() => setMaxSessionDuration(opt.value)}
                  testID={`duration-option-${opt.value}`}
                />
              ))}
            </View>
          </View>

          <View className="gap-3">
            <AppText variant="caption" className="text-content-secondary uppercase tracking-wider">
              Tolérance au volume *
            </AppText>
            <SegmentedControl
              options={VOLUME_OPTIONS}
              value={answers.volumeTolerance}
              onChange={setVolumeTolerance}
              testID="volume-tolerance-control"
            />
          </View>

          {answers.goal === 'mixed' ? (
            <View className="gap-3">
              <AppText variant="caption" className="text-content-secondary uppercase tracking-wider">
                Priorité (objectif mixte)
              </AppText>
              <SegmentedControl
                options={MIXED_PRIORITY_OPTIONS}
                value={answers.mixedPriority}
                onChange={setMixedPriority}
                testID="mixed-priority-control"
              />
            </View>
          ) : null}

          <View className="gap-3">
            <AppText variant="caption" className="text-content-secondary uppercase tracking-wider">
              Muscles à prioriser
            </AppText>
            <View className="gap-2">
              {PRIORITY_MUSCLE_OPTIONS.map((muscle) => (
                <CardChoice
                  key={muscle}
                  label={muscle}
                  selected={answers.priorityMuscles.includes(muscle)}
                  onPress={() => toggleMuscle(muscle)}
                  testID={`muscle-option-${muscle}`}
                />
              ))}
            </View>
          </View>

          <Input
            label="Sports parallèles"
            placeholder="Ex : trail, tennis, crossfit…"
            value={answers.sportsParallel}
            onChangeText={setSportsParallel}
            autoCapitalize="sentences"
            testID="coaching-sports-input"
          />
        </View>
      </StepLayout>
    </KeyboardAvoidingView>
  );
}
