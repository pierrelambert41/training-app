import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Card, AppText, Button, Input } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { RecoveryLog } from '@/types';
import type { DailyCheckinValues } from '../hooks/use-daily-checkin';

const NOTES_MAX_LENGTH = 200;
const DEFAULT_VALUE = 5;

type Props = {
  todayLog: RecoveryLog | null;
  onSave: (values: DailyCheckinValues) => void;
  isSaving: boolean;
};

type ScaleRowProps = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  testID: string;
};

function CheckinValue({ label, value }: { label: string; value: number | null }) {
  return (
    <View className="flex-1 items-center gap-0.5 bg-background-elevated rounded-card py-3">
      <AppText className="text-content-primary font-bold" style={{ fontSize: 20, lineHeight: 24 }}>
        {value ?? '–'}
      </AppText>
      <AppText variant="caption" muted>{label}</AppText>
    </View>
  );
}

function ScaleRow({ label, value, onChange, testID }: ScaleRowProps) {
  return (
    <View className="gap-1">
      <View className="flex-row justify-between">
        <AppText variant="caption" muted>
          {label}
        </AppText>
        <AppText variant="caption" className="font-semibold text-content-primary">
          {value}/10
        </AppText>
      </View>
      <Slider
        testID={testID}
        style={{ height: 44 }}
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.accent}
        accessibilityLabel={`${label} ${value} sur 10`}
      />
    </View>
  );
}

/**
 * Carte "Check-in du jour" (TA-148) : 3 curseurs 1-10 + note optionnelle.
 * Après saisie, bascule en résumé compact éditable. Coexiste avec le
 * check-in pré-séance (readiness sur Session) — granularité jour vs séance.
 */
export function DailyCheckinCard({ todayLog, onSave, isSaving }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [sleepQuality, setSleepQuality] = useState(todayLog?.sleepQuality ?? DEFAULT_VALUE);
  const [energy, setEnergy] = useState(todayLog?.energy ?? DEFAULT_VALUE);
  const [soreness, setSoreness] = useState(todayLog?.soreness ?? DEFAULT_VALUE);
  const [notes, setNotes] = useState(todayLog?.notes ?? '');

  const showForm = todayLog === null || isEditing;

  function handleSave() {
    onSave({ sleepQuality, energy, soreness, notes });
    setIsEditing(false);
  }

  function handleEdit() {
    setSleepQuality(todayLog?.sleepQuality ?? DEFAULT_VALUE);
    setEnergy(todayLog?.energy ?? DEFAULT_VALUE);
    setSoreness(todayLog?.soreness ?? DEFAULT_VALUE);
    setNotes(todayLog?.notes ?? '');
    setIsEditing(true);
  }

  if (!showForm) {
    return (
      <Card elevation="default" className="gap-3" testID="daily-checkin-summary">
        <View className="flex-row gap-3">
          <CheckinValue label="Sommeil" value={todayLog.sleepQuality} />
          <CheckinValue label="Énergie" value={todayLog.energy} />
          <CheckinValue label="Courbatures" value={todayLog.soreness} />
        </View>
        {todayLog.notes ? (
          <AppText variant="caption" muted numberOfLines={2}>
            {todayLog.notes}
          </AppText>
        ) : null}
        <Pressable
          onPress={handleEdit}
          className="h-tap items-center justify-center self-start active:opacity-70"
          accessibilityLabel="Modifier le check-in du jour"
          testID="daily-checkin-edit"
        >
          <AppText variant="caption" className="text-accent font-semibold">
            Modifier
          </AppText>
        </Pressable>
      </Card>
    );
  }

  return (
    <Card elevation="default" className="gap-4" testID="daily-checkin-form">
      <AppText variant="caption" muted>
        Comment tu te sens aujourd'hui ? (10 secondes)
      </AppText>

      <ScaleRow
        label="Sommeil"
        value={sleepQuality}
        onChange={setSleepQuality}
        testID="checkin-sleep-slider"
      />
      <ScaleRow
        label="Énergie"
        value={energy}
        onChange={setEnergy}
        testID="checkin-energy-slider"
      />
      <ScaleRow
        label="Courbatures"
        value={soreness}
        onChange={setSoreness}
        testID="checkin-soreness-slider"
      />

      <Input
        label="Note (optionnel)"
        value={notes}
        onChangeText={setNotes}
        maxLength={NOTES_MAX_LENGTH}
        placeholder="Stress, douleurs, contexte…"
        testID="checkin-notes-input"
      />

      <Button
        label="Valider"
        onPress={handleSave}
        variant="primary"
        loading={isSaving}
        testID="checkin-submit-button"
      />
    </Card>
  );
}
