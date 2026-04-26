import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { RirSelector } from './rir-selector';
import { defaultsForCategory } from '../domain/defaults-for-category';
import type { UnplannedDefaults } from '../types/session-ui';
import type { Exercise } from '@/types';

export type AddUnplannedConfigModalProps = {
  visible: boolean;
  exercise: Exercise | null;
  onConfirm: (config: UnplannedDefaults) => void;
  onBack: () => void;
  onClose: () => void;
};

export function AddUnplannedConfigModal({
  visible,
  exercise,
  onConfirm,
  onBack,
  onClose,
}: AddUnplannedConfigModalProps) {
  const defaults = defaultsForCategory(exercise?.category);

  const [sets, setSets] = useState(String(defaults.sets));
  const [repMin, setRepMin] = useState(String(defaults.repRangeMin));
  const [repMax, setRepMax] = useState(String(defaults.repRangeMax));
  const [rir, setRir] = useState(defaults.targetRir);
  const [rest, setRest] = useState(String(defaults.restSeconds));

  useEffect(() => {
    if (visible && exercise) {
      const d = defaultsForCategory(exercise.category);
      setSets(String(d.sets));
      setRepMin(String(d.repRangeMin));
      setRepMax(String(d.repRangeMax));
      setRir(d.targetRir);
      setRest(String(d.restSeconds));
    }
  }, [visible, exercise]);

  const parsedSets = sets.length > 0 ? parseInt(sets, 10) : null;
  const parsedRepMin = repMin.length > 0 ? parseInt(repMin, 10) : null;
  const parsedRepMax = repMax.length > 0 ? parseInt(repMax, 10) : null;
  const parsedRest = rest.length > 0 ? parseInt(rest, 10) : null;

  const canConfirm =
    parsedSets !== null && parsedSets > 0 &&
    parsedRepMin !== null && parsedRepMin > 0 &&
    parsedRepMax !== null && parsedRepMax >= (parsedRepMin ?? 0) &&
    parsedRest !== null && parsedRest >= 0;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm({
      sets: parsedSets!,
      repRangeMin: parsedRepMin!,
      repRangeMax: parsedRepMax!,
      targetRir: rir,
      restSeconds: parsedRest!,
      progressionType: defaults.progressionType,
    });
  }

  if (!exercise) return null;

  const displayName = exercise.nameFr ?? exercise.name;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Pressable
            onPress={onBack}
            style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}
            accessibilityLabel="Retour"
            testID="config-modal-back"
          >
            <AppText className="text-body text-accent">‹ Retour</AppText>
          </Pressable>
          <Pressable
            onPress={onClose}
            style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
            accessibilityLabel="Annuler"
            testID="config-modal-cancel"
          >
            <AppText className="text-body text-content-muted">Annuler</AppText>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pt-4 pb-8 gap-5"
          keyboardShouldPersistTaps="handled"
        >
          <View className="gap-1">
            <AppText className="text-caption text-content-muted uppercase font-semibold">
              Exercice sélectionné
            </AppText>
            <AppText className="text-heading font-bold text-content-primary">
              {displayName}
            </AppText>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 gap-1">
              <AppText className="text-label text-content-secondary text-center">Sets</AppText>
              <TextInput
                value={sets}
                onChangeText={setSets}
                keyboardType="number-pad"
                selectTextOnFocus
                className="h-14 rounded-card bg-background-surface border border-border text-xl text-content-primary text-center font-bold"
                style={{ fontSize: 22, fontWeight: '700' }}
                placeholderTextColor={colors.contentMuted}
                placeholder="3"
                testID="config-sets-input"
              />
            </View>

            <View className="flex-1 gap-1">
              <AppText className="text-label text-content-secondary text-center">Reps min</AppText>
              <TextInput
                value={repMin}
                onChangeText={setRepMin}
                keyboardType="number-pad"
                selectTextOnFocus
                className="h-14 rounded-card bg-background-surface border border-border text-xl text-content-primary text-center font-bold"
                style={{ fontSize: 22, fontWeight: '700' }}
                placeholderTextColor={colors.contentMuted}
                testID="config-rep-min-input"
              />
            </View>

            <View className="flex-1 gap-1">
              <AppText className="text-label text-content-secondary text-center">Reps max</AppText>
              <TextInput
                value={repMax}
                onChangeText={setRepMax}
                keyboardType="number-pad"
                selectTextOnFocus
                className="h-14 rounded-card bg-background-surface border border-border text-xl text-content-primary text-center font-bold"
                style={{ fontSize: 22, fontWeight: '700' }}
                placeholderTextColor={colors.contentMuted}
                testID="config-rep-max-input"
              />
            </View>
          </View>

          <View className="gap-1">
            <AppText className="text-label text-content-secondary">RIR cible</AppText>
            <RirSelector value={rir} onChange={setRir} />
          </View>

          <View className="gap-1">
            <AppText className="text-label text-content-secondary text-center">Repos (secondes)</AppText>
            <TextInput
              value={rest}
              onChangeText={setRest}
              keyboardType="number-pad"
              selectTextOnFocus
              className="h-14 rounded-card bg-background-surface border border-border text-xl text-content-primary text-center font-bold"
              style={{ fontSize: 22, fontWeight: '700' }}
              placeholderTextColor={colors.contentMuted}
              testID="config-rest-input"
            />
          </View>

          <Pressable
            onPress={handleConfirm}
            disabled={!canConfirm}
            style={{ minHeight: 56 }}
            className={`rounded-button items-center justify-center ${canConfirm ? 'bg-accent' : 'bg-background-elevated'}`}
            accessibilityLabel="Ajouter l'exercice"
            testID="config-confirm-button"
          >
            <AppText
              className={`text-label font-bold ${canConfirm ? 'text-content-on-accent' : 'text-content-muted'}`}
            >
              Ajouter l'exercice
            </AppText>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
