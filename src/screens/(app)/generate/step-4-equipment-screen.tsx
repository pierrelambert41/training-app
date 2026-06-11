import { useRouter } from 'expo-router';
import { Building2, House, Backpack } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useGenerationStore } from '@/stores/generation-store';
import { CardChoice, StepLayout } from '@/components/ui';
import type { EquipmentType } from '@/types';

const EQUIPMENT_OPTIONS: { value: EquipmentType; label: string; description: string; icon: LucideIcon }[] = [
  {
    value: 'full_gym',
    label: 'Salle complète',
    description: 'Accès à barres, machines, câbles et haltères',
    icon: Building2,
  },
  {
    value: 'home',
    label: 'Home gym',
    description: 'Rack, barre, haltères — équipement complet à domicile',
    icon: House,
  },
  {
    value: 'minimal',
    label: 'Minimal',
    description: 'Haltères fixes, bandes élastiques, poids de corps',
    icon: Backpack,
  },
];

export default function Step4EquipmentScreen() {
  const router = useRouter();
  const equipment = useGenerationStore((s) => s.answers.equipment);
  const setEquipment = useGenerationStore((s) => s.setEquipment);

  function handleNext() {
    router.push('/(app)/programs/generate/step-5-constraints');
  }

  function handleBack() {
    router.back();
  }

  return (
    <StepLayout
      step={4}
      title="Quel équipement as-tu ?"
      subtitle="Le programme sera généré avec les exercices adaptés à ton matériel."
      onNext={handleNext}
      onBack={handleBack}
      nextDisabled={equipment === null}
    >
      {EQUIPMENT_OPTIONS.map((option) => (
        <CardChoice
          key={option.value}
          label={option.label}
          description={option.description}
          icon={option.icon}
          selected={equipment === option.value}
          onPress={() => setEquipment(option.value)}
          testID={`equipment-option-${option.value}`}
        />
      ))}
    </StepLayout>
  );
}
