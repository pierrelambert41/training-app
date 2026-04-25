import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { useGenerationStore } from '@/stores/generation-store';
import { useAuthStore } from '@/stores/auth-store';
import { useActiveProgramStore } from '@/stores/active-program-store';
import { useDB } from '@/hooks/use-db';
import { generateProgram } from '@/services/program-generation';
import { searchExercises } from '@/services/exercises';
import { deactivateAllProgramsForUser, insertProgram } from '@/services/programs';
import { insertBlock } from '@/services/blocks';
import { insertWorkoutDay } from '@/services/workout-days';
import { insertPlannedExercise } from '@/services/planned-exercises';
import { AppText, Button, Card, StepLayout } from '@/components/ui';

const GOAL_LABELS: Record<string, string> = {
  hypertrophy: 'Hypertrophie',
  strength: 'Force',
  mixed: 'Mixte',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  full_gym: 'Salle complète',
  home: 'Home gym',
  minimal: 'Minimal',
};

const VOLUME_LABELS: Record<string, string> = {
  low: 'Faible',
  medium: 'Moyenne',
  high: 'Haute',
};

type SummaryRowProps = {
  label: string;
  value: string;
};

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <View className="flex-row justify-between items-start py-3 border-b border-border">
      <AppText variant="caption" className="text-content-secondary flex-1">
        {label}
      </AppText>
      <AppText variant="body" className="text-content-primary flex-1 text-right">
        {value}
      </AppText>
    </View>
  );
}

export default function Step8SummaryScreen() {
  const router = useRouter();
  const answers = useGenerationStore((s) => s.answers);
  const reset = useGenerationStore((s) => s.reset);
  const user = useAuthStore((s) => s.user);
  const db = useDB();
  const setProgram = useActiveProgramStore((s) => s.setProgram);
  const setActiveBlock = useActiveProgramStore((s) => s.setActiveBlock);
  const setWorkoutDays = useActiveProgramStore((s) => s.setWorkoutDays);
  const [isGenerating, setIsGenerating] = useState(false);

  async function handleGenerate() {
    if (!user) {
      Alert.alert('Erreur', 'Utilisateur non connecté. Reconnecte-toi et réessaie.');
      return;
    }

    setIsGenerating(true);
    try {
      const catalogue = await searchExercises(db, '');
      const result = await generateProgram({
        userId: user.id,
        answers,
        catalogue,
      });

      let savedProgram: import('@/types').Program | null = null;
      let savedBlock: import('@/types').Block | null = null;
      const savedDays: import('@/types/workout-day').WorkoutDay[] = [];

      await db.withTransactionAsync(async () => {
        await deactivateAllProgramsForUser(db, user.id);
        savedProgram = await insertProgram(db, result.program);
        savedBlock = await insertBlock(db, result.block);
        for (const { day, plannedExercises } of result.days) {
          const savedDay = await insertWorkoutDay(db, day);
          savedDays.push(savedDay);
          for (const pe of plannedExercises) {
            await insertPlannedExercise(db, pe);
          }
        }
      });

      setProgram(savedProgram);
      setActiveBlock(savedBlock);
      setWorkoutDays(savedDays);
      reset();
      router.replace('/(app)');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur inattendue est survenue.';
      Alert.alert('Erreur de génération', message);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleBack() {
    router.back();
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2 gap-3">
        <View className="flex-row items-center gap-2">
          <AppText variant="caption" muted>Étape 8/8</AppText>
        </View>
        <View className="h-1 bg-background-surface rounded-chip overflow-hidden">
          <View className="h-full bg-accent rounded-chip w-full" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-4 pb-8 gap-6"
      >
        <View className="gap-1">
          <AppText className="text-display text-content-primary font-bold">Résumé</AppText>
          <AppText variant="body" className="text-content-secondary">
            Vérifie tes réponses avant de lancer la génération.
          </AppText>
        </View>

        <Card>
          <View className="gap-0">
            {answers.goal ? (
              <SummaryRow label="Objectif" value={GOAL_LABELS[answers.goal] ?? answers.goal} />
            ) : null}
            {answers.frequencyDays ? (
              <SummaryRow label="Fréquence" value={`${answers.frequencyDays} jours / semaine`} />
            ) : null}
            {answers.level ? (
              <SummaryRow label="Niveau" value={LEVEL_LABELS[answers.level] ?? answers.level} />
            ) : null}
            {answers.equipment ? (
              <SummaryRow label="Matériel" value={EQUIPMENT_LABELS[answers.equipment] ?? answers.equipment} />
            ) : null}
          </View>
        </Card>

        <Card>
          <View className="gap-0">
            {answers.maxSessionDurationMin ? (
              <SummaryRow label="Durée max séance" value={`${answers.maxSessionDurationMin} min`} />
            ) : null}
            {answers.volumeTolerance ? (
              <SummaryRow label="Tolérance volume" value={VOLUME_LABELS[answers.volumeTolerance] ?? answers.volumeTolerance} />
            ) : null}
            {answers.goal === 'mixed' && answers.mixedPriority ? (
              <SummaryRow
                label="Priorité mixte"
                value={answers.mixedPriority === 'strength' ? 'Force' : 'Look'}
              />
            ) : null}
            {answers.priorityMuscles.length > 0 ? (
              <SummaryRow label="Muscles prioritaires" value={answers.priorityMuscles.join(', ')} />
            ) : null}
            {answers.sportsParallel.trim().length > 0 ? (
              <SummaryRow label="Sports parallèles" value={answers.sportsParallel} />
            ) : null}
          </View>
        </Card>

        {(answers.injuries.trim().length > 0 || answers.avoidExercises.trim().length > 0) ? (
          <Card>
            <View className="gap-0">
              {answers.injuries.trim().length > 0 ? (
                <SummaryRow label="Blessures" value={answers.injuries} />
              ) : null}
              {answers.avoidExercises.trim().length > 0 ? (
                <SummaryRow label="À éviter" value={answers.avoidExercises} />
              ) : null}
            </View>
          </Card>
        ) : null}

        {(answers.weightKg.trim().length > 0 ||
          answers.heightCm.trim().length > 0 ||
          answers.readinessAvg !== null ||
          answers.attendancePercent !== null) ? (
          <Card>
            <View className="gap-0">
              {answers.weightKg.trim().length > 0 ? (
                <SummaryRow label="Poids" value={`${answers.weightKg} kg`} />
              ) : null}
              {answers.heightCm.trim().length > 0 ? (
                <SummaryRow label="Taille" value={`${answers.heightCm} cm`} />
              ) : null}
              {answers.readinessAvg !== null ? (
                <SummaryRow label="Readiness moyen" value={`${answers.readinessAvg} / 5`} />
              ) : null}
              {answers.attendancePercent !== null ? (
                <SummaryRow label="Assiduité récente" value={`${answers.attendancePercent} %`} />
              ) : null}
            </View>
          </Card>
        ) : null}

        {/* Retour à l'étape 1 pour modifier les réponses */}
        <Button
          label="Modifier"
          onPress={() => router.push('/(app)/programs/generate')}
          variant="ghost"
        />
      </ScrollView>

      <View className="px-4 pb-8 pt-3 gap-3 border-t border-border">
        <Button
          label="Générer mon programme"
          onPress={handleGenerate}
          size="lg"
          loading={isGenerating}
          disabled={isGenerating}
          testID="generate-submit-button"
        />
        <Button
          label="Retour"
          onPress={handleBack}
          variant="ghost"
          disabled={isGenerating}
        />
      </View>
    </View>
  );
}
