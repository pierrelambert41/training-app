import { useRouter } from 'expo-router';
import { useGenerationStore } from '@/stores/generation-store';
import { CardChoice, StepLayout } from '@/components/ui';
import type { GenerationAnswers } from '@/types/generation';

type FrequencyOption = {
  value: NonNullable<GenerationAnswers['frequencyDays']>;
  label: string;
  description: string;
};

const FREQUENCY_OPTIONS: FrequencyOption[] = [
  {
    value: 3,
    label: '3 jours / semaine',
    description: 'Full body — idéal pour optimiser la récupération',
  },
  {
    value: 4,
    label: '4 jours / semaine',
    description: 'Upper/Lower — bon équilibre volume et récupération',
  },
  {
    value: 5,
    label: '5 jours / semaine',
    description: 'Push/Pull/Legs + — volume élevé pour intermédiaires',
  },
  {
    value: 6,
    label: '6 jours / semaine',
    description: 'PPL x2 — haute fréquence pour avancés',
  },
];

export default function Step2FrequencyScreen() {
  const router = useRouter();
  const frequencyDays = useGenerationStore((s) => s.answers.frequencyDays);
  const setFrequency = useGenerationStore((s) => s.setFrequency);

  function handleNext() {
    router.push('/(app)/programs/generate/step-3-level');
  }

  function handleBack() {
    router.back();
  }

  return (
    <StepLayout
      step={2}
      title="Combien de jours par semaine ?"
      subtitle="Choisis une fréquence réaliste et tenable sur le long terme."
      onNext={handleNext}
      onBack={handleBack}
      nextDisabled={frequencyDays === null}
    >
      {FREQUENCY_OPTIONS.map((option) => (
        <CardChoice
          key={option.value}
          label={option.label}
          description={option.description}
          selected={frequencyDays === option.value}
          onPress={() => setFrequency(option.value)}
          testID={`frequency-option-${option.value}`}
        />
      ))}
    </StepLayout>
  );
}
