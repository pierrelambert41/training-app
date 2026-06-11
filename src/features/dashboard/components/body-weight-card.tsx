import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Input } from '@/components/ui';
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

function formatKg(value: number): string {
  return `${value} kg`;
}

/**
 * Parse une saisie décimale FR ou EN ("82,5" / "82.5"). null si invalide
 * ou hors bornes plausibles (30-300 kg).
 */
export function parseWeightInput(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.');
  if (normalized === '' || !/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  if (value < MIN_WEIGHT_KG || value > MAX_WEIGHT_KG) return null;
  return Math.round(value * 10) / 10;
}

/**
 * Carte "Poids du corps" : pesée rapide du jour (upsert par date) + courbe
 * sur 90 jours. Une seule pesée par jour, re-saisie = correction.
 */
export function BodyWeightCard({ metrics, onSaveWeight, isSaving }: Props) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);

  const points = metrics
    .filter((m) => m.weightKg !== null)
    .map((m) => ({ label: formatDateLabel(m.date), value: m.weightKg! }));

  const last = points.length > 0 ? points[points.length - 1]!.value : null;

  function handleSave() {
    const parsed = parseWeightInput(input);
    if (parsed === null) {
      setError(`Poids invalide (entre ${MIN_WEIGHT_KG} et ${MAX_WEIGHT_KG} kg)`);
      return;
    }
    setError(undefined);
    setInput('');
    onSaveWeight(parsed);
  }

  return (
    <Card elevation="default" className="gap-3" testID="body-weight-card">
      <View className="flex-row items-baseline justify-between">
        <AppText variant="body" className="font-semibold">
          Poids du corps
        </AppText>
        {last !== null ? (
          <AppText variant="heading" testID="body-weight-last">
            {formatKg(last)}
          </AppText>
        ) : null}
      </View>

      <View className="flex-row items-start gap-2">
        <View className="flex-1">
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="Poids du jour (kg)"
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
        formatValue={formatKg}
        emptyMessage="Logge ton poids régulièrement pour voir la tendance (minimum 2 pesées)."
        testID="body-weight-chart"
      />
    </Card>
  );
}
