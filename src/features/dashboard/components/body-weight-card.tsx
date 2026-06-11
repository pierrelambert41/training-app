import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Input } from '@/components/ui';
import { formatWeight, fromDisplayWeight, toDisplayWeight } from '@/lib/units';
import type { WeightUnit } from '@/lib/units';
import { usePreferredUnit } from '@/stores/settings-store';
import type { BodyMetric } from '@/types';
import { LineChart } from './line-chart';

const MIN_WEIGHT_KG = 30;
const MAX_WEIGHT_KG = 300;

type Props = {
  metrics: BodyMetric[];
  onSaveWeight: (weightKg: number) => void;
  isSaving: boolean;
};

function formatDateLabel(isoDate: string): string {
  const [, month, day] = isoDate.split('-');
  return `${day}/${month}`;
}

/**
 * Parse une saisie décimale FR ou EN ("82,5" / "82.5") dans l'unité
 * d'affichage, retourne des KG canoniques. null si invalide ou hors bornes
 * plausibles (30-300 kg).
 */
export function parseWeightInput(raw: string, unit: WeightUnit = 'kg'): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '' || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  const kg = fromDisplayWeight(Number(normalized), unit);
  if (kg < MIN_WEIGHT_KG || kg > MAX_WEIGHT_KG) return null;
  return Math.round(kg * 10) / 10;
}

/**
 * Carte "Poids du corps" : pesée rapide du jour (upsert par date) + courbe
 * sur 90 jours. Une seule pesée par jour, re-saisie = correction.
 * Stockage kg canonique, affichage/saisie dans l'unité préférée.
 */
export function BodyWeightCard({ metrics, onSaveWeight, isSaving }: Props) {
  const unit = usePreferredUnit();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const points = metrics
    .filter((m) => m.weightKg !== null)
    .map((m) => ({ label: formatDateLabel(m.date), value: toDisplayWeight(m.weightKg!, unit) }));

  const lastKg = metrics.filter((m) => m.weightKg !== null).at(-1)?.weightKg ?? null;

  function handleSave() {
    const parsedKg = parseWeightInput(input, unit);
    if (parsedKg === null) {
      const min = toDisplayWeight(MIN_WEIGHT_KG, unit);
      const max = toDisplayWeight(MAX_WEIGHT_KG, unit);
      setError(`Poids invalide (entre ${min} et ${max} ${unit})`);
      return;
    }
    setError(undefined);
    setInput('');
    onSaveWeight(parsedKg);
  }

  return (
    <Card elevation="default" className="gap-3" testID="body-weight-card">
      <View className="flex-row items-baseline justify-between">
        <AppText variant="body" className="font-semibold">
          Poids du corps
        </AppText>
        {lastKg !== null ? (
          <AppText variant="heading" testID="body-weight-last">
            {formatWeight(lastKg, unit)}
          </AppText>
        ) : null}
      </View>

      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          <Input
            value={input}
            onChangeText={setInput}
            placeholder={`Poids du jour (${unit})`}
            keyboardType="decimal-pad"
            error={error}
            testID="body-weight-input"
          />
        </View>
        <Button
          label="OK"
          onPress={handleSave}
          variant="primary"
          loading={isSaving}
          testID="body-weight-submit"
        />
      </View>

      <LineChart
        points={points}
        formatValue={(v) => `${v} ${unit}`}
        emptyMessage="Logge ton poids régulièrement pour voir la tendance (minimum 2 pesées)."
        testID="body-weight-chart"
      />
    </Card>
  );
}
