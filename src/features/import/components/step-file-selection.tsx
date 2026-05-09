import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { colors } from '@/theme/tokens';

type Props = {
  fileName: string | null;
  fileError: string | null;
  hasData: boolean;
  isPicking: boolean;
  onPickFile: () => void;
  onNext: () => void;
};

export function StepFileSelection({
  fileName,
  fileError,
  hasData,
  isPicking,
  onPickFile,
  onNext,
}: Props) {
  return (
    <View className="flex-1 px-5 pt-8 gap-6">
      <View className="gap-2">
        <Text className="text-2xl font-bold text-content-primary">Importer depuis Hevy</Text>
        <Text className="text-body text-content-secondary">
          Sélectionnez le fichier CSV exporté depuis Hevy pour importer votre historique.
        </Text>
      </View>

      <Pressable
        onPress={onPickFile}
        disabled={isPicking}
        className="border-2 border-dashed border-border rounded-card p-8 items-center gap-4 active:opacity-70"
      >
        {isPicking ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <Text className="text-4xl">📂</Text>
            <Text className="text-body font-semibold text-accent text-center">
              Choisir un fichier CSV
            </Text>
            <Text className="text-caption text-content-muted text-center">
              Format attendu : export Hevy (.csv)
            </Text>
          </>
        )}
      </Pressable>

      {fileName ? (
        <View className="bg-background-surface border border-border rounded-card px-4 py-3 flex-row items-center gap-3">
          <Text className="text-lg">✅</Text>
          <Text className="text-body text-content-primary flex-1" numberOfLines={1}>
            {fileName}
          </Text>
        </View>
      ) : null}

      {fileError ? (
        <View className="bg-red-950 border border-red-800 rounded-card px-4 py-3 flex-row items-start gap-3">
          <Text className="text-lg">⚠️</Text>
          <Text className="text-body text-red-400 flex-1">{fileError}</Text>
        </View>
      ) : null}

      <View className="mt-auto pb-8 gap-3">
        <Pressable
          onPress={onNext}
          disabled={!hasData}
          className="bg-accent h-14 rounded-button items-center justify-center disabled:opacity-40"
        >
          <Text className="text-body font-semibold text-content-on-accent">
            Suivant — Vérifier les exercices
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
