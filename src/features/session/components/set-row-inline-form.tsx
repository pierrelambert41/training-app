import { useState, useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { LogType, SetLogSide } from '@/types';

export type InlineLogValues = {
  load: number | null;
  reps: number | null;
  rir: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  side: SetLogSide | null;
};

type SetRowInlineFormProps = {
  logType: LogType;
  side: SetLogSide | null;
  prefillLoad: string;
  prefillReps: string;
  prefillDuration: string;
  prefillDistance: string;
  prefillRir: number | null;
  onLog: (values: InlineLogValues) => void;
};

const inputBase = {
  height: 44,
  minWidth: 64,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: '#1e2d4a',
  backgroundColor: '#0f1628',
  color: colors.contentPrimary,
  fontSize: 18,
  fontWeight: '700' as const,
  textAlign: 'center' as const,
  paddingHorizontal: 8,
};

const rirInputStyle = {
  ...inputBase,
  minWidth: 44,
  width: 44,
};

export function SetRowInlineForm({
  logType,
  side,
  prefillLoad,
  prefillReps,
  prefillDuration,
  prefillDistance,
  prefillRir,
  onLog,
}: SetRowInlineFormProps) {
  const field2Ref = useRef<TextInput>(null);
  const showRir = logType === 'weight_reps' || logType === 'bodyweight_reps';

  const [load, setLoad] = useState(prefillLoad);
  const [reps, setReps] = useState(prefillReps);
  const [duration, setDuration] = useState(prefillDuration);
  const [distance, setDistance] = useState(prefillDistance);
  const [rir, setRir] = useState(prefillRir !== null ? String(prefillRir) : '');

  function buildAndLog() {
    const parsedLoad = load.length > 0 ? parseFloat(load) : null;
    const parsedReps = reps.length > 0 ? parseInt(reps, 10) : null;
    const parsedDuration = duration.length > 0 ? parseInt(duration, 10) : null;
    const parsedDistance = distance.length > 0 ? parseFloat(distance) : null;
    const parsedRir = rir.length > 0 ? parseInt(rir, 10) : null;

    const canLog = (() => {
      if (logType === 'weight_reps') return parsedLoad !== null && !isNaN(parsedLoad) && parsedReps !== null && parsedReps > 0;
      if (logType === 'bodyweight_reps') return parsedReps !== null && parsedReps > 0;
      if (logType === 'duration') return parsedDuration !== null && parsedDuration > 0;
      if (logType === 'distance_duration') return parsedDistance !== null && parsedDistance > 0 && parsedDuration !== null && parsedDuration > 0;
      return false;
    })();

    if (!canLog) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    onLog({
      load: logType === 'weight_reps' ? parsedLoad : logType === 'bodyweight_reps' ? (parsedLoad ?? null) : null,
      reps: (logType === 'weight_reps' || logType === 'bodyweight_reps') ? parsedReps : null,
      rir: showRir ? (parsedRir !== null && !isNaN(parsedRir) ? parsedRir : prefillRir) : null,
      durationSeconds: (logType === 'duration' || logType === 'distance_duration') ? parsedDuration : null,
      distanceMeters: logType === 'distance_duration' ? parsedDistance : null,
      side,
    });
  }

  return (
    <View className="flex-row items-center gap-2 flex-1">
      {logType === 'weight_reps' && (
        <>
          <TextInput
            value={load}
            onChangeText={setLoad}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => field2Ref.current?.focus()}
            selectTextOnFocus
            style={inputBase}
            placeholderTextColor={colors.contentMuted}
            placeholder="kg"
            accessibilityLabel="Charge en kg"
            testID="inline-load-input"
          />
          <AppText className="text-caption text-content-muted">kg</AppText>
          <TextInput
            ref={field2Ref}
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={buildAndLog}
            selectTextOnFocus
            style={inputBase}
            placeholderTextColor={colors.contentMuted}
            placeholder="reps"
            accessibilityLabel="Nombre de répétitions"
            testID="inline-reps-input"
          />
          <AppText className="text-caption text-content-muted">reps</AppText>
        </>
      )}

      {logType === 'bodyweight_reps' && (
        <>
          <TextInput
            value={reps}
            onChangeText={setReps}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={buildAndLog}
            selectTextOnFocus
            style={inputBase}
            placeholderTextColor={colors.contentMuted}
            placeholder="reps"
            accessibilityLabel="Nombre de répétitions"
            testID="inline-reps-input"
          />
          <AppText className="text-caption text-content-muted">reps</AppText>
        </>
      )}

      {logType === 'duration' && (
        <>
          <TextInput
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={buildAndLog}
            selectTextOnFocus
            style={inputBase}
            placeholderTextColor={colors.contentMuted}
            placeholder="s"
            accessibilityLabel="Durée en secondes"
            testID="inline-duration-input"
          />
          <AppText className="text-caption text-content-muted">s</AppText>
        </>
      )}

      {logType === 'distance_duration' && (
        <>
          <TextInput
            value={distance}
            onChangeText={setDistance}
            keyboardType="decimal-pad"
            returnKeyType="next"
            onSubmitEditing={() => field2Ref.current?.focus()}
            selectTextOnFocus
            style={inputBase}
            placeholderTextColor={colors.contentMuted}
            placeholder="m"
            accessibilityLabel="Distance en mètres"
            testID="inline-distance-input"
          />
          <AppText className="text-caption text-content-muted">m</AppText>
          <TextInput
            ref={field2Ref}
            value={duration}
            onChangeText={setDuration}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={buildAndLog}
            selectTextOnFocus
            style={inputBase}
            placeholderTextColor={colors.contentMuted}
            placeholder="s"
            accessibilityLabel="Durée en secondes"
            testID="inline-duration-input"
          />
          <AppText className="text-caption text-content-muted">s</AppText>
        </>
      )}

      {showRir && (
        <View className="items-center">
          <TextInput
            value={rir}
            onChangeText={setRir}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={buildAndLog}
            selectTextOnFocus
            maxLength={1}
            style={rirInputStyle}
            placeholderTextColor={colors.contentMuted}
            placeholder="0"
            accessibilityLabel="RIR (reps en réserve)"
            testID="inline-rir-input"
          />
          <AppText className="text-caption text-content-muted">RIR</AppText>
        </View>
      )}

      <Pressable
        onPress={buildAndLog}
        style={{
          minHeight: 44,
          minWidth: 44,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 22,
          backgroundColor: colors.accent,
        }}
        accessibilityLabel="Valider le set"
        accessibilityRole="button"
        testID="check-set-button"
        hitSlop={4}
      >
        <AppText style={{ fontSize: 20, color: colors.contentOnAccent, fontWeight: '700' }}>✓</AppText>
      </Pressable>
    </View>
  );
}
