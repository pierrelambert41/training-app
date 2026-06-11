import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { RotateCcw, X } from 'lucide-react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { WeightUnit } from '@/lib/units';
import {
  groupPlates,
  PLATE_SETS,
  suggestPlatesPerSide,
  totalFromPlates,
} from '../domain/plate-math';

type Props = {
  visible: boolean;
  unit: WeightUnit;
  /** Poids de barre dans l'unité d'affichage. */
  barWeight: number;
  /** Charge cible (unité d'affichage) — pré-remplit la suggestion de plaques. */
  initialTarget: number | null;
  onClose: () => void;
  /** Charge totale retenue, dans l'unité d'affichage. */
  onApply: (total: number) => void;
};

const MAX_PLATE_HEIGHT = 72;
const MIN_PLATE_HEIGHT = 30;

function plateHeight(plate: number, maxPlate: number): number {
  return MIN_PLATE_HEIGHT + (plate / maxPlate) * (MAX_PLATE_HEIGHT - MIN_PLATE_HEIGHT);
}

/**
 * Calculateur de chargement de barre façon Hevy : on tape les plaques d'UN
 * côté, le total (barre + 2×côté) se calcule tout seul. Ouvert avec une
 * cible → suggestion de plaques pré-remplie.
 */
export function PlateCalculatorSheet({
  visible,
  unit,
  barWeight,
  initialTarget,
  onClose,
  onApply,
}: Props) {
  const availablePlates = PLATE_SETS[unit];
  const maxPlate = availablePlates[0]!;
  const [platesPerSide, setPlatesPerSide] = useState<number[]>([]);

  useEffect(() => {
    if (visible) {
      const suggested =
        initialTarget !== null
          ? suggestPlatesPerSide(initialTarget, barWeight, availablePlates)
          : null;
      setPlatesPerSide(suggested ?? []);
    }
    // Volontairement déclenché à l'ouverture uniquement (pas sur initialTarget).
  }, [visible]);

  const total = totalFromPlates(barWeight, platesPerSide);
  const grouped = groupPlates(platesPerSide);

  function addPlate(plate: number) {
    setPlatesPerSide((prev) => [...prev, plate]);
  }

  function removePlate(plate: number) {
    setPlatesPerSide((prev) => {
      const idx = prev.indexOf(plate);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} accessibilityLabel="Fermer" />
      <View className="bg-background-elevated rounded-t-3xl px-5 pt-5 pb-10 gap-5">
        <View className="flex-row items-center justify-between">
          <AppText className="text-heading text-content-primary">Chargement de barre</AppText>
          <Pressable
            onPress={onClose}
            style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
            accessibilityLabel="Fermer le calculateur"
            testID="plate-calculator-close"
          >
            <X size={20} color={colors.contentMuted} />
          </Pressable>
        </View>

        <View className="flex-row items-baseline justify-between">
          <AppText variant="caption" muted>
            Barre {barWeight} {unit} · plaques par côté
          </AppText>
          <Pressable
            onPress={() => setPlatesPerSide([])}
            className="flex-row items-center gap-1 active:opacity-70"
            hitSlop={10}
            accessibilityLabel="Vider les plaques"
            testID="plate-calculator-reset"
          >
            <RotateCcw size={12} color={colors.contentMuted} />
            <AppText variant="caption" muted>Vider</AppText>
          </Pressable>
        </View>

        {/* Visualisation d'un côté de la barre : tap sur une plaque pour la retirer. */}
        <View className="flex-row items-center justify-center gap-1 h-24">
          <View className="w-10 h-2 rounded-chip bg-border-strong" />
          {grouped.length === 0 ? (
            <AppText variant="caption" muted className="ml-2">
              Barre à vide — ajoute des plaques
            </AppText>
          ) : (
            grouped.map(({ plate, count }) =>
              Array.from({ length: count }, (_, i) => (
                <Pressable
                  key={`${plate}-${i}`}
                  onPress={() => removePlate(plate)}
                  className="items-center justify-center rounded-md bg-accent/20 border border-accent/50 active:opacity-60"
                  style={{ width: 34, height: plateHeight(plate, maxPlate) }}
                  accessibilityLabel={`Retirer une plaque de ${plate} ${unit}`}
                  testID={`plate-stack-${plate}-${i}`}
                >
                  <AppText className="text-caption font-bold text-accent" style={{ fontSize: 10 }}>
                    {plate}
                  </AppText>
                </Pressable>
              ))
            )
          )}
          <View className="w-4 h-2 rounded-chip bg-border-strong" />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {availablePlates.map((plate) => (
              <Pressable
                key={plate}
                onPress={() => addPlate(plate)}
                className="w-14 h-14 rounded-full bg-background-surface items-center justify-center active:opacity-70"
                accessibilityLabel={`Ajouter une plaque de ${plate} ${unit}`}
                testID={`plate-add-${plate}`}
              >
                <AppText className="text-label font-bold text-content-primary">{plate}</AppText>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <Pressable
          onPress={() => onApply(total)}
          className="h-14 rounded-button bg-accent items-center justify-center active:opacity-80"
          accessibilityLabel={`Utiliser ${total} ${unit}`}
          testID="plate-calculator-apply"
        >
          <AppText className="text-body font-bold text-content-on-accent">
            Utiliser {total} {unit}
          </AppText>
        </Pressable>
      </View>
    </Modal>
  );
}
