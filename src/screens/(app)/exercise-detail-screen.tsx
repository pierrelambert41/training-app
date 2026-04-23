import { ScrollView, View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useExerciseDetail } from '@/hooks/use-exercise-detail';
import { useFavorite } from '@/hooks/use-favorite';
import { AppText, Card } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { Exercise } from '@/types';

type Props = {
  exerciseId: string;
};

const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Pectoraux',
  lats: 'Dorsaux',
  back: 'Dos',
  lower_back: 'Bas du dos',
  quads: 'Quadriceps',
  hamstrings: 'Ischio-jambiers',
  glutes: 'Fessiers',
  glute_medius: 'Moyen fessier',
  adductors: 'Adducteurs',
  calves: 'Mollets',
  triceps: 'Triceps',
  biceps: 'Biceps',
  shoulders: 'Épaules',
  front_deltoid: 'Deltoïde antérieur',
  lateral_deltoid: 'Deltoïde latéral',
  rear_deltoid: 'Deltoïde postérieur',
  traps: 'Trapèzes',
  lower_traps: 'Trapèzes inférieurs',
  core: 'Gainage',
  rectus_abdominis: 'Grand droit',
  lower_rectus_abdominis: 'Bas des abdos',
  forearms: 'Avant-bras',
  lower_chest: 'Pec inférieur',
  legs: 'Jambes',
};

const CATEGORY_LABELS: Record<string, string> = {
  compound: 'Poly-articulaire',
  isolation: 'Isolation',
  bodyweight: 'Poids de corps',
  machine: 'Machine',
  cable: 'Poulie',
};

const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barre',
  dumbbell: 'Haltères',
  cable: 'Poulie',
  machine: 'Machine',
  bodyweight: 'Poids de corps',
  bench: 'Banc',
  pullup_bar: 'Barre de traction',
  dip_bar: 'Barres parallèles',
  kettlebell: 'Kettlebell',
  resistance_band: 'Élastique',
};

function muscleLabel(muscle: string): string {
  return MUSCLE_LABELS[muscle] ?? muscle.replace(/_/g, ' ');
}

function equipmentLabel(eq: string): string {
  return EQUIPMENT_LABELS[eq] ?? eq.replace(/_/g, ' ');
}

function TagList({ items, emptyLabel }: { items: string[]; emptyLabel: string }) {
  if (items.length === 0) {
    return <AppText variant="caption" muted>{emptyLabel}</AppText>;
  }
  return (
    <View className="flex-row flex-wrap gap-2">
      {items.map((item) => (
        <View
          key={item}
          className="bg-background-surface border border-border rounded-full px-3 py-1"
        >
          <AppText variant="caption">{item}</AppText>
        </View>
      ))}
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-3">
      <AppText variant="caption" muted className="mb-2 uppercase tracking-wide">
        {title}
      </AppText>
      {children}
    </Card>
  );
}

function AlternativeRow({ exercise, onPress }: { exercise: Exercise; onPress: (exercise: Exercise) => void }) {
  const displayName = exercise.nameFr ?? exercise.name;
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between py-2 border-b border-border last:border-b-0"
      onPress={() => onPress(exercise)}
      activeOpacity={0.6}
      testID={`alternative-row-${exercise.id}`}
    >
      <View className="flex-1 gap-0.5">
        <AppText variant="body">{displayName}</AppText>
        {exercise.primaryMuscles.length > 0 && (
          <AppText variant="caption" muted numberOfLines={1}>
            {exercise.primaryMuscles.map(muscleLabel).join(', ')}
          </AppText>
        )}
      </View>
      <AppText variant="caption" muted className="ml-3">›</AppText>
    </TouchableOpacity>
  );
}

export default function ExerciseDetailScreen({ exerciseId }: Props) {
  const router = useRouter();
  const { data, isLoading } = useExerciseDetail(exerciseId);
  const { isFavorite, toggle, isPending } = useFavorite(exerciseId);

  const handleAlternativePress = (exercise: Exercise) => {
    const href: Href = { pathname: '/(app)/exercise/[id]', params: { id: exercise.id } };
    router.push(href);
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center" testID="exercise-detail-loading">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!data) {
    return (
      <View className="flex-1 bg-background items-center justify-center p-4" testID="exercise-detail-not-found">
        <AppText variant="body" muted>Exercice introuvable.</AppText>
      </View>
    );
  }

  const { exercise, alternatives } = data;
  const displayName = exercise.nameFr ?? exercise.name;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-4 pb-8"
      testID="exercise-detail-screen"
    >
      <View className="flex-row items-start justify-between mb-4" testID="exercise-detail-header">
        <View className="flex-1 mr-3">
          <AppText variant="heading" testID="exercise-detail-name">
            {displayName}
          </AppText>
          {exercise.nameFr && exercise.nameFr !== exercise.name && (
            <AppText variant="caption" muted className="mt-0.5">
              {exercise.name}
            </AppText>
          )}
        </View>

        <TouchableOpacity
          onPress={() => toggle()}
          disabled={isPending}
          className="items-center justify-center w-11 h-11"
          activeOpacity={0.6}
          testID="exercise-detail-favorite-button"
          accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          accessibilityRole="button"
        >
          <AppText
            variant="heading"
            className={isFavorite ? 'text-yellow-400' : 'text-content-muted'}
          >
            {isFavorite ? '★' : '☆'}
          </AppText>
        </TouchableOpacity>
      </View>

      <SectionCard title="Catégorie">
        <AppText variant="body" testID="exercise-detail-category">
          {CATEGORY_LABELS[exercise.category] ?? exercise.category}
        </AppText>
      </SectionCard>

      <SectionCard title="Équipement">
        {exercise.equipment.length > 0 ? (
          <TagList
            items={exercise.equipment.map(equipmentLabel)}
            emptyLabel="Aucun équipement requis"
          />
        ) : (
          <AppText variant="caption" muted>Aucun équipement requis</AppText>
        )}
      </SectionCard>

      <SectionCard title="Muscles principaux">
        <TagList
          items={exercise.primaryMuscles.map(muscleLabel)}
          emptyLabel="Non renseigné"
        />
      </SectionCard>

      {exercise.secondaryMuscles.length > 0 && (
        <SectionCard title="Muscles secondaires">
          <TagList
            items={exercise.secondaryMuscles.map(muscleLabel)}
            emptyLabel="Aucun"
          />
        </SectionCard>
      )}

      {exercise.coachingNotes && (
        <SectionCard title="Notes de coaching">
          <AppText
            variant="body"
            className="leading-relaxed"
            testID="exercise-detail-coaching-notes"
          >
            {exercise.coachingNotes}
          </AppText>
        </SectionCard>
      )}

      {alternatives.length > 0 && (
        <SectionCard title="Alternatives">
          <View testID="exercise-detail-alternatives">
            {alternatives.map((alt) => (
              <AlternativeRow
                key={alt.id}
                exercise={alt}
                onPress={handleAlternativePress}
              />
            ))}
          </View>
        </SectionCard>
      )}
    </ScrollView>
  );
}
