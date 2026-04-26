import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { useDebounce } from '@/hooks/use-debounce';
import { useExercises } from '@/hooks/use-exercises';
import type { Exercise } from '@/types';

export type ExercisePickerModalProps = {
  visible: boolean;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
};

export function ExercisePickerModal({ visible, onSelect, onClose }: ExercisePickerModalProps) {
  const [rawQuery, setRawQuery] = useState('');
  const searchQuery = useDebounce(rawQuery, 300);
  const { data: exercises, isLoading } = useExercises(searchQuery);

  function handleClose() {
    setRawQuery('');
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <AppText className="text-heading font-bold text-content-primary">
            Choisir un exercice
          </AppText>
          <Pressable
            onPress={handleClose}
            style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
            accessibilityLabel="Fermer"
            testID="exercise-picker-close"
          >
            <AppText className="text-body text-accent">Annuler</AppText>
          </Pressable>
        </View>

        <View className="px-4 pt-3 pb-2">
          <TextInput
            value={rawQuery}
            onChangeText={setRawQuery}
            placeholder="Rechercher…"
            placeholderTextColor={colors.contentMuted}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            className="h-tap rounded-button bg-background-surface border border-border px-4 text-body text-content-primary"
            testID="exercise-picker-search"
          />
        </View>

        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={exercises ?? []}
            keyExtractor={(item) => item.id}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            renderItem={({ item }) => {
              const displayName = item.nameFr ?? item.name;
              const muscles = item.primaryMuscles.slice(0, 2).join(', ');
              return (
                <Pressable
                  onPress={() => {
                    setRawQuery('');
                    onSelect(item);
                  }}
                  style={{ minHeight: 44 }}
                  className="flex-row items-center px-4 py-3 border-b border-border active:bg-background-elevated"
                  testID={`picker-exercise-${item.id}`}
                >
                  <View className="flex-1 gap-0.5">
                    <AppText className="text-body text-content-primary">{displayName}</AppText>
                    {muscles.length > 0 && (
                      <AppText className="text-caption text-content-muted">{muscles}</AppText>
                    )}
                  </View>
                  <AppText className="text-caption text-content-muted ml-3">›</AppText>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="p-8 items-center">
                <AppText className="text-body text-content-muted">
                  {searchQuery.trim().length > 0 ? `Aucun résultat pour "${searchQuery.trim()}"` : 'Bibliothèque vide.'}
                </AppText>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
