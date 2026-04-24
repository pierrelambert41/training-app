import { useRouter } from 'expo-router';
import { useGenerationStore } from '@/stores/generation-store';
import { CardChoice, StepLayout } from '@/components/ui';
import type { TrainingLevel } from '@/types';

const LEVEL_OPTIONS: { value: TrainingLevel; label: string; description: string; icon: string }[] = [
  {
    value: 'beginner',
    label: 'Débutant',
    description: 'Moins de 1 an de pratique sérieuse et régulière',
    icon: '🌱',
  },
  {
    value: 'intermediate',
    label: 'Intermédiaire',
    description: '1 à 4 ans de pratique, progression régulière',
    icon: '📈',
  },
  {
    value: 'advanced',
    label: 'Avancé',
    description: '4+ ans, progression lente, bases solides',
    icon: '🎯',
  },
];

export default function Step3LevelScreen() {
  const router = useRouter();
  const level = useGenerationStore((s) => s.answers.level);
  const setLevel = useGenerationStore((s) => s.setLevel);

  function handleNext() {
    router.push('/(app)/programs/generate/step-4-equipment');
  }

  function handleBack() {
    router.back();
  }

  return (
    <StepLayout
      step={3}
      title="Quel est ton niveau ?"
      subtitle="Sois honnête — un programme adapté à ton niveau réel est toujours plus efficace."
      onNext={handleNext}
      onBack={handleBack}
      nextDisabled={level === null}
    >
      {LEVEL_OPTIONS.map((option) => (
        <CardChoice
          key={option.value}
          label={option.label}
          description={option.description}
          icon={option.icon}
          selected={level === option.value}
          onPress={() => setLevel(option.value)}
          testID={`level-option-${option.value}`}
        />
      ))}
    </StepLayout>
  );
}
