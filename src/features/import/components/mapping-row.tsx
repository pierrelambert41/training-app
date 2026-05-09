import { Pressable, Text, View } from 'react-native';
import type { ExerciseMatch } from '../types/import-state';

type Props = {
  mapping: ExerciseMatch;
  onEdit: () => void;
  onIgnore: () => void;
};

export function MappingRow({ mapping, onEdit, onIgnore }: Props) {
  const isMapped = mapping.internalId !== null;
  const isIgnored = mapping.ignored;

  return (
    <View
      className="bg-background-surface border border-border rounded-card px-4 py-3 gap-2"
      style={{ opacity: isIgnored ? 0.5 : 1 }}
    >
      <View className="flex-row items-center gap-2">
        {!isMapped && !isIgnored ? (
          <View className="bg-red-600 rounded-chip px-2 py-0.5">
            <Text className="text-caption text-white font-semibold">Non mappé</Text>
          </View>
        ) : isIgnored ? (
          <View className="bg-content-muted rounded-chip px-2 py-0.5">
            <Text className="text-caption text-white font-semibold">Ignoré</Text>
          </View>
        ) : (
          <View className="bg-green-800 rounded-chip px-2 py-0.5">
            <Text className="text-caption text-green-200 font-semibold">OK</Text>
          </View>
        )}
        <Text className="text-body font-medium text-content-primary flex-1" numberOfLines={1}>
          {mapping.hevyName}
        </Text>
      </View>

      {isMapped && !isIgnored ? (
        <Text className="text-caption text-content-secondary">
          → {mapping.internalName}
        </Text>
      ) : null}

      <View className="flex-row gap-2 mt-1">
        <Pressable
          onPress={onEdit}
          style={{ minHeight: 44, minWidth: 44 }}
          className="flex-1 border border-accent rounded-button items-center justify-center"
        >
          <Text className="text-caption text-accent font-semibold">
            {isMapped ? 'Modifier' : 'Mapper'}
          </Text>
        </Pressable>
        <Pressable
          onPress={onIgnore}
          style={{ minHeight: 44, minWidth: 44 }}
          className="flex-1 border border-border rounded-button items-center justify-center"
        >
          <Text className="text-caption text-content-secondary font-semibold">
            {isIgnored ? 'Réactiver' : 'Ignorer'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
