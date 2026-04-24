import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { useGenerationStore } from '@/stores/generation-store';
import { Input, StepLayout, AppText } from '@/components/ui';

export default function Step5ConstraintsScreen() {
  const router = useRouter();
  const injuries = useGenerationStore((s) => s.answers.injuries);
  const avoidExercises = useGenerationStore((s) => s.answers.avoidExercises);
  const setInjuries = useGenerationStore((s) => s.setInjuries);
  const setAvoidExercises = useGenerationStore((s) => s.setAvoidExercises);

  function handleNext() {
    router.push('/(app)/programs/generate/step-6-coaching');
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
        step={5}
        title="Contraintes"
        subtitle="Ces informations permettent d'éviter les exercices inadaptés à ta situation."
        onNext={handleNext}
        onBack={handleBack}
        nextLabel="Suivant"
      >
        <View className="gap-5">
          <Input
            label="Blessures ou douleurs actuelles"
            placeholder="Ex : douleur épaule droite, genou gauche sensible…"
            value={injuries}
            onChangeText={setInjuries}
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            testID="constraints-injuries-input"
          />
          <Input
            label="Exercices à éviter"
            placeholder="Ex : développé couché barre, squat…"
            value={avoidExercises}
            onChangeText={setAvoidExercises}
            autoCapitalize="sentences"
            multiline
            numberOfLines={3}
            testID="constraints-avoid-input"
          />
          <AppText variant="caption" muted>
            Ces champs sont optionnels. Tu pourras les modifier plus tard depuis ton profil.
          </AppText>
        </View>
      </StepLayout>
    </KeyboardAvoidingView>
  );
}
