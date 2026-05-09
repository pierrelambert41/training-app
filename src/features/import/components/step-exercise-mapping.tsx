import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ExerciseMatch } from '../types/import-state';
import { ExerciseSearchModal } from './exercise-search-modal';
import { MappingRow } from './mapping-row';
import type { Exercise } from '@/types';

type Props = {
  mappings: ExerciseMatch[];
  warnings: number;
  unmappedCount: number;
  onUpdateMapping: (hevyName: string, internalId: string | null, internalName: string | null) => void;
  onToggleIgnore: (hevyName: string) => void;
  onNext: () => void;
  onBack: () => void;
};

type ActivePicker = { hevyName: string } | null;

export function StepExerciseMapping({
  mappings,
  warnings,
  unmappedCount,
  onUpdateMapping,
  onToggleIgnore,
  onNext,
  onBack,
}: Props) {
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);

  function handleSelect(exercise: Exercise) {
    if (!activePicker) return;
    onUpdateMapping(activePicker.hevyName, exercise.id, exercise.nameFr ?? exercise.name);
    setActivePicker(null);
  }

  const canProceed = unmappedCount === 0;

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-background">
      <View className="px-5 pt-4 pb-3 gap-2 border-b border-border">
        <Text className="text-xl font-bold text-content-primary">Correspondance des exercices</Text>
        <Text className="text-caption text-content-secondary">
          {mappings.length} exercice{mappings.length > 1 ? 's' : ''} trouvé{mappings.length > 1 ? 's' : ''} dans le fichier
        </Text>

        {unmappedCount > 0 ? (
          <View className="bg-red-950 border border-red-800 rounded-card px-3 py-2 flex-row items-center gap-2">
            <Text className="text-base">⚠️</Text>
            <Text className="text-caption text-red-400 flex-1">
              {unmappedCount} exercice{unmappedCount > 1 ? 's' : ''} non mappé{unmappedCount > 1 ? 's' : ''} — mappez-les ou ignorez-les pour continuer.
            </Text>
          </View>
        ) : null}

        {warnings > 0 ? (
          <View className="bg-yellow-950 border border-yellow-800 rounded-card px-3 py-2 flex-row items-center gap-2">
            <Text className="text-base">ℹ️</Text>
            <Text className="text-caption text-yellow-400 flex-1">
              {warnings} avertissement{warnings > 1 ? 's' : ''} dans le fichier (non bloquant{warnings > 1 ? 's' : ''}).
            </Text>
          </View>
        ) : null}
      </View>

      <FlatList
        data={mappings}
        keyExtractor={(item) => item.hevyName}
        contentContainerClassName="px-5 py-4 gap-3"
        renderItem={({ item }) => (
          <MappingRow
            mapping={item}
            onEdit={() => setActivePicker({ hevyName: item.hevyName })}
            onIgnore={() => onToggleIgnore(item.hevyName)}
          />
        )}
      />

      <View className="px-5 pb-8 pt-3 gap-3 border-t border-border">
        <Pressable
          onPress={onNext}
          disabled={!canProceed}
          className="bg-accent h-14 rounded-button items-center justify-center disabled:opacity-40"
        >
          <Text className="text-body font-semibold text-content-on-accent">
            Suivant — Confirmer l'import
          </Text>
        </Pressable>
        <Pressable
          onPress={onBack}
          className="h-tap items-center justify-center"
        >
          <Text className="text-body text-accent font-medium">Retour</Text>
        </Pressable>
      </View>

      <ExerciseSearchModal
        visible={activePicker !== null}
        onSelect={handleSelect}
        onClose={() => setActivePicker(null)}
      />
    </SafeAreaView>
  );
}
