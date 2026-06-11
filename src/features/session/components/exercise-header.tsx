import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import type { WeightUnit } from '@/lib/units';

type ExerciseHeaderProps = {
  name: string;
  primaryMuscles: string[];
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRir: number | null;
  /** Déjà converti dans l'unité d'affichage par l'appelant. */
  targetLoad: number | null;
  unit: WeightUnit;
};

function TargetStat({ value, unit }: { value: string; unit: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 bg-background-surface rounded-card py-3">
      <AppText
        className="font-bold text-content-primary"
        style={{ fontSize: 24, lineHeight: 28, letterSpacing: -0.3, fontVariant: ['tabular-nums'] }}
      >
        {value}
      </AppText>
      <AppText className="text-caption text-content-muted uppercase" style={{ letterSpacing: 0.8 }}>
        {unit}
      </AppText>
    </View>
  );
}

export function ExerciseHeader({
  name,
  primaryMuscles,
  sets,
  repRangeMin,
  repRangeMax,
  targetRir,
  targetLoad,
  unit,
}: ExerciseHeaderProps) {
  const musclesLabel = primaryMuscles.slice(0, 3).join(' · ');

  return (
    <View className="gap-3 pb-1">
      <View className="gap-1">
        <Pressable
          onPress={() => console.warn('TODO TA-15: ouvrir fiche exercice en modal')}
          accessibilityLabel={`Voir la fiche de ${name}`}
          accessibilityRole="button"
        >
          <AppText
            className="font-bold text-content-primary"
            style={{ fontSize: 25, lineHeight: 30, letterSpacing: -0.4 }}
            numberOfLines={2}
          >
            {name}
          </AppText>
        </Pressable>

        {musclesLabel ? (
          <AppText className="text-caption text-content-muted uppercase" style={{ letterSpacing: 1 }}>
            {musclesLabel}
          </AppText>
        ) : null}
      </View>

      <View className="flex-row gap-2">
        <TargetStat value={targetLoad !== null ? String(targetLoad) : '—'} unit={unit} />
        <TargetStat
          value={`${sets}×${repRangeMin}${repRangeMin !== repRangeMax ? `–${repRangeMax}` : ''}`}
          unit="sets × reps"
        />
        {targetRir !== null ? <TargetStat value={String(targetRir)} unit="RIR cible" /> : null}
      </View>
    </View>
  );
}
