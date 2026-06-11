import { Keyboard, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { ExerciseAchievement } from '@/services/session-scores';
import type { PlannedExercise, SetLog } from '@/types';
import { AchievementDot } from './session-score-ring';

const NOTE_MAX_LENGTH = 500;

// ---------------------------------------------------------------------------
// Liste "PAR EXERCICE" — sets complétés et achievement par exercice planifié
// ---------------------------------------------------------------------------

type PerExerciseListProps = {
  plannedExercises: PlannedExercise[];
  exercisesById: Map<string, { name: string; nameFr?: string | null }>;
  achievements: ExerciseAchievement[];
  setLogs: SetLog[];
};

export function PerExerciseList({
  plannedExercises,
  exercisesById,
  achievements,
  setLogs,
}: PerExerciseListProps) {
  if (plannedExercises.length === 0) return null;

  return (
    <View className="rounded-card overflow-hidden" style={{ backgroundColor: colors.backgroundSurface }}>
      <View className="px-4 pt-4 pb-2">
        <AppText className="text-label font-semibold text-content-secondary tracking-wide">
          PAR EXERCICE
        </AppText>
      </View>
      {plannedExercises.map((pe, idx) => {
        const exercise = exercisesById.get(pe.exerciseId);
        const name = exercise?.nameFr ?? exercise?.name ?? pe.exerciseId;
        const achievement = achievements.find((a) => a.plannedExerciseId === pe.id);
        const logsCount = setLogs.filter(
          (sl) => sl.plannedExerciseId === pe.id && sl.completed
        ).length;
        return (
          <View
            key={pe.id}
            className="flex-row items-center px-4 py-3 gap-3"
            style={
              idx < plannedExercises.length - 1
                ? { borderBottomWidth: 1, borderBottomColor: colors.border }
                : undefined
            }
          >
            <AchievementDot achievement={achievement?.target_achievement ?? 0} />
            <AppText className="flex-1 text-body text-content-primary" numberOfLines={1}>
              {name}
            </AppText>
            <AppText className="text-label text-content-muted">
              {logsCount}/{pe.sets}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Notes de fin de séance
// ---------------------------------------------------------------------------

type PostNotesInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function PostNotesInput({ value, onChange }: PostNotesInputProps) {
  return (
    <View className="gap-2">
      <AppText className="text-label font-semibold text-content-secondary tracking-wide">
        NOTES DE FIN DE SÉANCE
      </AppText>
      <TextInput
        value={value}
        onChangeText={(v) => onChange(v.slice(0, NOTE_MAX_LENGTH))}
        multiline
        numberOfLines={3}
        returnKeyType="default"
        style={{
          minHeight: 80,
          fontSize: 15,
          color: colors.contentPrimary,
          backgroundColor: colors.backgroundSurface,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: 12,
          paddingVertical: 10,
          textAlignVertical: 'top',
        }}
        placeholderTextColor={colors.contentMuted}
        placeholder="Comment s'est passée la séance ?"
        accessibilityLabel="Notes de fin de séance"
        testID="post-session-notes-input"
        onBlur={() => Keyboard.dismiss()}
      />
      <AppText className="text-caption text-content-muted text-right">
        {value.length}/{NOTE_MAX_LENGTH}
      </AppText>
    </View>
  );
}
