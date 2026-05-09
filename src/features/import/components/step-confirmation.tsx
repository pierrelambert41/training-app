import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ParsedHevyData } from '../types/hevy-csv-types';
import type { ExerciseMatch } from '../types/import-state';
import { computeStats } from '../domain/compute-stats';
import { StatRow } from './stat-row';
import { colors } from '@/theme/tokens';

type Props = {
  parsedData: ParsedHevyData;
  mappings: ExerciseMatch[];
  onConfirm: () => void;
  onBack: () => void;
};

function WarningsAccordion({ warnings }: { warnings: ParsedHevyData['warnings'] }) {
  const [open, setOpen] = useState(false);
  if (warnings.length === 0) return null;
  return (
    <View className="bg-yellow-950 border border-yellow-800 rounded-card overflow-hidden">
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{ minHeight: 44 }}
        className="px-4 py-3 flex-row items-center gap-2"
      >
        <Text className="text-base">⚠️</Text>
        <Text className="text-caption text-yellow-400 flex-1 font-semibold">
          Avertissements ({warnings.length})
        </Text>
        <Text className="text-caption text-yellow-600">{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open ? (
        <View className="border-t border-yellow-800 px-4 pb-3 gap-2 pt-2">
          {warnings.map((w, i) => (
            <Text key={i} className="text-caption text-yellow-300">
              Ligne {w.line} : {w.message}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export function StepConfirmation({ parsedData, mappings, onConfirm, onBack }: Props) {
  const [isImporting, setIsImporting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const stats = computeStats(parsedData, mappings);

  async function handleConfirm() {
    setIsImporting(true);
    await onConfirm();
    setIsImporting(false);
    setIsDone(true);
  }

  if (isDone) {
    return (
      <SafeAreaView edges={['bottom']} className="flex-1 bg-background items-center justify-center px-8 gap-6">
        <Text className="text-6xl">✅</Text>
        <Text className="text-xl font-bold text-content-primary text-center">
          Import terminé
        </Text>
        <Text className="text-body text-content-secondary text-center">
          {stats.sessionCount} séance{stats.sessionCount > 1 ? 's' : ''} importée{stats.sessionCount > 1 ? 's' : ''} avec succès.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 bg-background">
      <ScrollView contentContainerClassName="px-5 pt-6 pb-8 gap-6">
        <View className="gap-2">
          <Text className="text-xl font-bold text-content-primary">Confirmer l'import</Text>
          <Text className="text-body text-content-secondary">
            Vérifiez le résumé avant de finaliser.
          </Text>
        </View>

        <View className="bg-background-surface border border-border rounded-card p-4 gap-4">
          <Text className="text-body font-semibold text-content-primary">Résumé</Text>
          <View className="gap-3">
            <StatRow icon="📅" label="Séances" value={stats.sessionCount} />
            <StatRow icon="🏋️" label="Exercices" value={stats.exerciseCount} />
            <StatRow icon="📊" label="Sets" value={stats.setCount} />
            {stats.ignoredCount > 0 ? (
              <StatRow icon="⏭️" label="Exercices ignorés" value={stats.ignoredCount} muted />
            ) : null}
          </View>
        </View>

        <WarningsAccordion warnings={parsedData.warnings} />

        <View className="gap-3">
          <Pressable
            onPress={handleConfirm}
            disabled={isImporting}
            className="bg-accent h-14 rounded-button items-center justify-center disabled:opacity-50"
          >
            {isImporting ? (
              <ActivityIndicator color={colors.contentOnAccent} />
            ) : (
              <Text className="text-body font-semibold text-content-on-accent">Importer</Text>
            )}
          </Pressable>
          <Pressable
            onPress={onBack}
            disabled={isImporting}
            className="h-tap items-center justify-center disabled:opacity-40"
          >
            <Text className="text-body text-accent font-medium">Retour</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
