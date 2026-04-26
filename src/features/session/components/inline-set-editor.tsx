import { useRef, useState } from 'react';
import { Alert, Keyboard, Pressable, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { RirSelector } from './rir-selector';
import { InlineSetEditorFields } from './inline-set-editor-fields';
import type { EditSetPayload } from '@/stores/session-store';
import type { LogType, SetLog } from '@/types';

export type InlineSetEditorProps = {
  log: SetLog;
  logType: LogType;
  targetReps: number | null;
  onSave: (payload: EditSetPayload) => void;
  onDelete: () => void;
  onCancel: () => void;
};

export function InlineSetEditor({ log, logType, onSave, onDelete, onCancel }: InlineSetEditorProps) {
  const field1Ref = useRef<TextInput>(null);
  const field2Ref = useRef<TextInput>(null);
  const notesRef = useRef<TextInput>(null);

  const [load, setLoad] = useState(log.load !== null ? String(log.load) : '');
  const [reps, setReps] = useState(log.reps !== null ? String(log.reps) : '');
  const [durationSeconds, setDurationSeconds] = useState(log.durationSeconds !== null ? String(log.durationSeconds) : '');
  const [distanceMeters, setDistanceMeters] = useState(log.distanceMeters !== null ? String(log.distanceMeters) : '');
  const [rir, setRir] = useState<number | null>(log.rir);
  const [notes, setNotes] = useState(log.notes ?? '');

  const parsedLoad = load.length > 0 ? parseFloat(load) : null;
  const parsedReps = reps.length > 0 ? parseInt(reps, 10) : null;
  const parsedDuration = durationSeconds.length > 0 ? parseInt(durationSeconds, 10) : null;
  const parsedDistance = distanceMeters.length > 0 ? parseFloat(distanceMeters) : null;

  const canSave = (() => {
    if (logType === 'weight_reps') return parsedLoad !== null && !isNaN(parsedLoad) && parsedReps !== null && parsedReps > 0;
    if (logType === 'bodyweight_reps') return parsedReps !== null && parsedReps > 0;
    if (logType === 'duration') return parsedDuration !== null && parsedDuration > 0;
    if (logType === 'distance_duration') return parsedDistance !== null && parsedDistance > 0 && parsedDuration !== null && parsedDuration > 0;
    return false;
  })();

  function buildPayload(): EditSetPayload {
    if (logType === 'weight_reps') return { load: parsedLoad, reps: parsedReps, rir, notes: notes.trim() || null };
    if (logType === 'bodyweight_reps') return { load: parsedLoad ?? null, reps: parsedReps, rir, notes: notes.trim() || null };
    if (logType === 'duration') return { durationSeconds: parsedDuration, rir, notes: notes.trim() || null };
    if (logType === 'distance_duration') return { distanceMeters: parsedDistance, durationSeconds: parsedDuration, rir, notes: notes.trim() || null };
    return {};
  }

  function handleSave() {
    if (!canSave) return;
    Keyboard.dismiss();
    onSave(buildPayload());
  }

  function handleDeletePress() {
    Alert.alert(
      'Supprimer ce set ?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: onDelete },
      ]
    );
  }

  return (
    <View className="bg-background-elevated border border-accent rounded-card px-4 py-4 mb-2 gap-3">
      <InlineSetEditorFields
        logType={logType}
        load={load}
        reps={reps}
        durationSeconds={durationSeconds}
        distanceMeters={distanceMeters}
        field1Ref={field1Ref}
        field2Ref={field2Ref}
        onLoadChange={setLoad}
        onRepsChange={setReps}
        onDurationChange={setDurationSeconds}
        onDistanceChange={setDistanceMeters}
        onSubmit={handleSave}
      />

      <View className="gap-1">
        <AppText className="text-label text-content-secondary">RIR</AppText>
        <RirSelector value={rir} onChange={setRir} />
      </View>

      <View className="gap-1">
        <AppText className="text-label text-content-secondary">Notes</AppText>
        <TextInput
          ref={notesRef}
          value={notes}
          onChangeText={setNotes}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          className="h-10 rounded-card bg-background-surface border border-border text-body text-content-primary px-3"
          style={{ fontSize: 14 }}
          placeholderTextColor={colors.contentMuted}
          placeholder="Optionnel…"
          accessibilityLabel="Notes sur le set"
        />
      </View>

      <View className="flex-row gap-2">
        <Pressable
          onPress={handleDeletePress}
          style={{ minHeight: 44, flex: 1 }}
          className="rounded-button items-center justify-center bg-background-surface border border-border"
          accessibilityLabel="Supprimer ce set"
        >
          <AppText className="text-label font-semibold text-status-error">Supprimer</AppText>
        </Pressable>

        <Pressable
          onPress={onCancel}
          style={{ minHeight: 44, flex: 1 }}
          className="rounded-button items-center justify-center bg-background-surface border border-border"
          accessibilityLabel="Annuler l'édition"
        >
          <AppText className="text-label font-semibold text-content-secondary">Annuler</AppText>
        </Pressable>

        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={{ minHeight: 44, flex: 2 }}
          className={`rounded-button items-center justify-center ${canSave ? 'bg-accent' : 'bg-background-elevated'}`}
          accessibilityLabel="Valider les modifications"
        >
          <AppText className={`text-label font-bold ${canSave ? 'text-content-on-accent' : 'text-content-muted'}`}>
            Valider
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
