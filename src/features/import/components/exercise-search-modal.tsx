import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, TextInput, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDebounce } from '@/hooks/use-debounce';
import { useExercises } from '@/hooks/use-exercises';
import { colors } from '@/theme/tokens';
import type { Exercise } from '@/types';

type Props = {
  visible: boolean;
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
};

export function ExerciseSearchModal({ visible, onSelect, onClose }: Props) {
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
          <Text className="text-heading font-bold text-content-primary">
            Choisir un exercice
          </Text>
          <Pressable
            onPress={handleClose}
            style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
            accessibilityLabel="Fermer"
          >
            <Text className="text-body text-accent">Annuler</Text>
          </Pressable>
        </View>

        <View className="px-4 pt-3 pb-2">
          <TextInput
            value={rawQuery}
            onChangeText={setRawQuery}
            placeholder="Rechercher un exercice…"
            placeholderTextColor={colors.contentMuted}
            autoCorrect={false}
            autoCapitalize="none"
            clearButtonMode="while-editing"
            className="h-tap rounded-button bg-background-surface border border-border px-4 text-body text-content-primary"
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
                >
                  <View className="flex-1 gap-0.5">
                    <Text className="text-body text-content-primary">{displayName}</Text>
                    {muscles.length > 0 ? (
                      <Text className="text-caption text-content-muted">{muscles}</Text>
                    ) : null}
                  </View>
                  <Text className="text-caption text-content-muted ml-3">›</Text>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View className="p-8 items-center">
                <Text className="text-body text-content-muted">
                  {searchQuery.trim().length > 0
                    ? `Aucun résultat pour "${searchQuery.trim()}"`
                    : 'Aucun exercice trouvé.'}
                </Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
