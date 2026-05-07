import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { useGenerationStore } from '@/stores/generation-store';
import { hasConsecutiveDays } from '@/services/program-generation';
import { AppText, StepLayout } from '@/components/ui';

const DAY_LABELS: { value: number; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mer' },
  { value: 4, label: 'Jeu' },
  { value: 5, label: 'Ven' },
  { value: 6, label: 'Sam' },
  { value: 7, label: 'Dim' },
];

export default function Step2bDaysScreen() {
  const router = useRouter();
  const frequencyDays = useGenerationStore((s) => s.answers.frequencyDays);
  const preferredDays = useGenerationStore((s) => s.answers.preferredDays);
  const setPreferredDays = useGenerationStore((s) => s.setPreferredDays);

  useEffect(() => {
    if (!frequencyDays) router.back();
  }, [frequencyDays, router]);

  const required = frequencyDays ?? 3;
  const selected = preferredDays ?? [];

  function toggleDay(day: number) {
    if (selected.includes(day)) {
      setPreferredDays(selected.filter((d) => d !== day));
    } else if (selected.length < required) {
      setPreferredDays([...selected, day]);
    }
  }

  function handleNext() {
    router.push('/(app)/programs/generate/step-3-level');
  }

  function handleBack() {
    router.push('/(app)/programs/generate/step-2-frequency');
  }

  const isComplete = selected.length === required;
  const showWarning = isComplete && hasConsecutiveDays(selected);

  return (
    <StepLayout
      step={2}
      title="Quels jours t'entraînes-tu ?"
      subtitle="Sélectionne exactement les jours où tu seras disponible."
      onNext={handleNext}
      onBack={handleBack}
      nextLabel="Continuer"
      nextDisabled={!isComplete}
    >
      <View className="gap-4">
        <AppText variant="caption" className="text-content-secondary">
          {selected.length}/{required} jours sélectionnés
        </AppText>

        <View className="flex-row flex-wrap gap-3">
          {DAY_LABELS.map(({ value, label }) => {
            const isSelected = selected.includes(value);
            const isDisabled = !isSelected && selected.length >= required;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => toggleDay(value)}
                disabled={isDisabled}
                testID={`day-option-${value}`}
                className={[
                  'w-16 h-16 rounded-xl items-center justify-center border',
                  isSelected
                    ? 'bg-accent border-accent'
                    : isDisabled
                      ? 'bg-background-surface border-border opacity-40'
                      : 'bg-background-surface border-border',
                ].join(' ')}
              >
                <AppText
                  variant="body"
                  className={isSelected ? 'text-white font-semibold' : 'text-content-primary'}
                >
                  {label}
                </AppText>
              </TouchableOpacity>
            );
          })}
        </View>

        {showWarning ? (
          <View className="bg-status-warning/10 border border-status-warning/30 rounded-xl px-4 py-3">
            <AppText variant="caption" className="text-status-warning">
              3 jours consécutifs ou plus — prévois un jour de repos pour récupérer.
            </AppText>
          </View>
        ) : null}
      </View>
    </StepLayout>
  );
}
