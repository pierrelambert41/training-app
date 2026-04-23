import { useState, useCallback } from 'react';
import { View, FlatList, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useDebounce } from '@/hooks/use-debounce';
import { useExercises } from '@/hooks/use-exercises';
import { Input, EmptyState, ExerciseRow } from '@/components/ui';
import type { Exercise } from '@/types';
import { colors } from '@/theme/tokens';

export default function LibraryScreen() {
  const router = useRouter();
  const [rawQuery, setRawQuery] = useState('');
  const searchQuery = useDebounce(rawQuery, 300);
  const { data: exercises, isLoading } = useExercises(searchQuery);

  const handleExercisePress = useCallback(
    (exercise: Exercise) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.push({ pathname: '/(app)/exercise/[id]', params: { id: exercise.id } } as any);
    },
    [router]
  );

  return (
    <View className="flex-1 bg-background" testID="library-screen">
      <View className="px-4 pt-4 pb-2">
        <Input
          placeholder="Rechercher un exercice…"
          value={rawQuery}
          onChangeText={setRawQuery}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
          testID="library-search-input"
        />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} testID="library-loading" />
        </View>
      ) : exercises && exercises.length > 0 ? (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ExerciseRow exercise={item} onPress={handleExercisePress} />
          )}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={25}
          windowSize={10}
          testID="library-list"
        />
      ) : (
        <View className="px-4 mt-8">
          <EmptyState
            title="Aucun résultat"
            description={
              searchQuery.trim().length > 0
                ? `Aucun exercice ne correspond à "${searchQuery.trim()}".`
                : 'La bibliothèque est vide.'
            }
          />
        </View>
      )}
    </View>
  );
}
