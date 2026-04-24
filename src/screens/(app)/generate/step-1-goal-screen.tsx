import { useRouter } from 'expo-router';
import { useGenerationStore } from '@/stores/generation-store';
import { CardChoice, StepLayout } from '@/components/ui';
import type { ProgramGoal } from '@/types';

const GOAL_OPTIONS: { value: ProgramGoal; label: string; description: string; icon: string }[] = [
  {
    value: 'hypertrophy',
    label: 'Hypertrophie',
    description: 'Maximiser le volume musculaire',
    icon: '💪',
  },
  {
    value: 'strength',
    label: 'Force',
    description: 'Augmenter les charges sur les mouvements de base',
    icon: '🏋️',
  },
  {
    value: 'mixed',
    label: 'Mixte',
    description: 'Combiner hypertrophie et force',
    icon: '⚡',
  },
];

export default function Step1GoalScreen() {
  const router = useRouter();
  const goal = useGenerationStore((s) => s.answers.goal);
  const setGoal = useGenerationStore((s) => s.setGoal);

  function handleNext() {
    router.push('/(app)/programs/generate/step-2-frequency');
  }

  return (
    <StepLayout
      step={1}
      title="Quel est ton objectif ?"
      subtitle="Ton programme sera structuré autour de cet objectif principal."
      onNext={handleNext}
      nextDisabled={goal === null}
    >
      {GOAL_OPTIONS.map((option) => (
        <CardChoice
          key={option.value}
          label={option.label}
          description={option.description}
          icon={option.icon}
          selected={goal === option.value}
          onPress={() => setGoal(option.value)}
          testID={`goal-option-${option.value}`}
        />
      ))}
    </StepLayout>
  );
}
