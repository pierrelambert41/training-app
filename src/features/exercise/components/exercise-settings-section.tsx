import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { AppText, SegmentedControl } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { defaultBarWeightKg, fromDisplayWeight, toDisplayWeight } from '@/lib/units';
import type { WeightUnit } from '@/lib/units';
import { usePreferredUnit } from '@/stores/settings-store';
import type { Exercise } from '@/types';
import { useUpdateExerciseSettings } from '../hooks/use-update-exercise-settings';

type UnitChoice = 'auto' | WeightUnit;

type Props = {
  exercise: Exercise;
};

/**
 * Réglages locaux de l'exercice : unité d'affichage (machines en lb) et
 * poids de barre (plate calculator). Sauvegarde immédiate à la modification.
 */
export function ExerciseSettingsSection({ exercise }: Props) {
  const preferredUnit = usePreferredUnit();
  const { mutate: save } = useUpdateExerciseSettings(exercise.id);

  const [unitChoice, setUnitChoice] = useState<UnitChoice>(exercise.displayUnit ?? 'auto');
  const effectiveUnit = unitChoice === 'auto' ? preferredUnit : unitChoice;

  const isBarbell = exercise.equipment.includes('barbell');
  const initialBarKg = exercise.barWeightKg ?? (isBarbell ? defaultBarWeightKg(effectiveUnit) : null);
  const [barWeightText, setBarWeightText] = useState(
    initialBarKg !== null ? String(toDisplayWeight(initialBarKg, effectiveUnit)) : ''
  );

  function persist(choice: UnitChoice, barText: string) {
    const unit = choice === 'auto' ? preferredUnit : choice;
    const parsed = barText.length > 0 ? parseFloat(barText.replace(',', '.')) : NaN;
    save({
      displayUnit: choice === 'auto' ? null : choice,
      barWeightKg: !isNaN(parsed) && parsed > 0 ? fromDisplayWeight(parsed, unit) : null,
    });
  }

  function handleUnitChange(choice: UnitChoice) {
    // Convertit la valeur affichée du champ barre vers la nouvelle unité.
    const previousUnit = unitChoice === 'auto' ? preferredUnit : unitChoice;
    const nextUnit = choice === 'auto' ? preferredUnit : choice;
    let nextBarText = barWeightText;
    const parsed = parseFloat(barWeightText.replace(',', '.'));
    if (!isNaN(parsed) && previousUnit !== nextUnit) {
      nextBarText = String(toDisplayWeight(fromDisplayWeight(parsed, previousUnit), nextUnit));
      setBarWeightText(nextBarText);
    }
    setUnitChoice(choice);
    persist(choice, nextBarText);
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        <AppText variant="caption" muted>
          Unité d'affichage — « Auto » suit la préférence globale ({preferredUnit})
        </AppText>
        <SegmentedControl<UnitChoice>
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'kg', label: 'kg' },
            { value: 'lb', label: 'lb' },
          ]}
          value={unitChoice}
          onChange={handleUnitChange}
          testID="exercise-unit-control"
        />
      </View>

      <View className="gap-2">
        <AppText variant="caption" muted>
          Poids de la barre ({effectiveUnit}) — utilisé par le calculateur de plaques
        </AppText>
        <TextInput
          value={barWeightText}
          onChangeText={setBarWeightText}
          onEndEditing={() => persist(unitChoice, barWeightText)}
          keyboardType="decimal-pad"
          className="w-full bg-background-surface border border-border rounded-field h-tap px-4 text-body text-content-primary"
          placeholderTextColor={colors.contentPlaceholder}
          placeholder={isBarbell ? String(toDisplayWeight(defaultBarWeightKg(effectiveUnit), effectiveUnit)) : '—'}
          accessibilityLabel={`Poids de la barre en ${effectiveUnit}`}
          testID="exercise-bar-weight-input"
        />
      </View>
    </View>
  );
}
