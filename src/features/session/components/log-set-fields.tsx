import { RefObject } from 'react';
import { TextInput, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import type { LogType } from '@/types';

type LogSetFieldsProps = {
  logType: LogType;
  load: string;
  reps: string;
  durationSeconds: string;
  distanceMeters: string;
  field1Ref: RefObject<TextInput | null>;
  field2Ref: RefObject<TextInput | null>;
  onLoadChange: (v: string) => void;
  onRepsChange: (v: string) => void;
  onDurationChange: (v: string) => void;
  onDistanceChange: (v: string) => void;
  onSubmit: () => void;
};

const inputClassName = 'h-22 rounded-card bg-background-surface border border-border text-display text-content-primary text-center font-bold';
const inputStyle = { fontSize: 32, fontWeight: '700' as const };

export function LogSetFields({
  logType,
  load,
  reps,
  durationSeconds,
  distanceMeters,
  field1Ref,
  field2Ref,
  onLoadChange,
  onRepsChange,
  onDurationChange,
  onDistanceChange,
  onSubmit,
}: LogSetFieldsProps) {
  return (
    <View className="flex-row gap-3">
      {logType === 'weight_reps' && (
        <>
          <View className="flex-1 gap-1">
            <AppText className="text-label text-content-secondary text-center">Charge (kg)</AppText>
            <TextInput
              ref={field1Ref}
              value={load}
              onChangeText={onLoadChange}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => field2Ref.current?.focus()}
              selectTextOnFocus
              className={inputClassName}
              style={inputStyle}
              placeholderTextColor={colors.contentMuted}
              placeholder="—"
              accessibilityLabel="Charge en kg"
              testID="load-input"
            />
          </View>
          <View className="flex-1 gap-1">
            <AppText className="text-label text-content-secondary text-center">Reps</AppText>
            <TextInput
              ref={field2Ref}
              value={reps}
              onChangeText={onRepsChange}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              selectTextOnFocus
              className={inputClassName}
              style={inputStyle}
              placeholderTextColor={colors.contentMuted}
              placeholder="—"
              accessibilityLabel="Nombre de répétitions"
              testID="reps-input"
            />
          </View>
        </>
      )}

      {logType === 'bodyweight_reps' && (
        <>
          <View className="flex-1 gap-1">
            <AppText className="text-label text-content-secondary text-center">Reps</AppText>
            <TextInput
              ref={field1Ref}
              value={reps}
              onChangeText={onRepsChange}
              keyboardType="number-pad"
              returnKeyType="next"
              onSubmitEditing={() => field2Ref.current?.focus()}
              selectTextOnFocus
              className={inputClassName}
              style={inputStyle}
              placeholderTextColor={colors.contentMuted}
              placeholder="—"
              accessibilityLabel="Nombre de répétitions"
              testID="reps-input"
            />
          </View>
          <View className="flex-1 gap-1">
            <AppText className="text-label text-content-secondary text-center">Lest (kg)</AppText>
            <TextInput
              ref={field2Ref}
              value={load}
              onChangeText={onLoadChange}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              selectTextOnFocus
              className={inputClassName}
              style={inputStyle}
              placeholderTextColor={colors.contentMuted}
              placeholder="0"
              accessibilityLabel="Lest optionnel en kg"
              testID="load-input"
            />
          </View>
        </>
      )}

      {logType === 'duration' && (
        <View className="flex-1 gap-1">
          <AppText className="text-label text-content-secondary text-center">Durée (secondes)</AppText>
          <TextInput
            ref={field1Ref}
            value={durationSeconds}
            onChangeText={onDurationChange}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={onSubmit}
            selectTextOnFocus
            className={inputClassName}
            style={inputStyle}
            placeholderTextColor={colors.contentMuted}
            placeholder="—"
            accessibilityLabel="Durée en secondes"
            testID="duration-input"
          />
        </View>
      )}

      {logType === 'distance_duration' && (
        <>
          <View className="flex-1 gap-1">
            <AppText className="text-label text-content-secondary text-center">Distance (m)</AppText>
            <TextInput
              ref={field1Ref}
              value={distanceMeters}
              onChangeText={onDistanceChange}
              keyboardType="decimal-pad"
              returnKeyType="next"
              onSubmitEditing={() => field2Ref.current?.focus()}
              selectTextOnFocus
              className={inputClassName}
              style={inputStyle}
              placeholderTextColor={colors.contentMuted}
              placeholder="—"
              accessibilityLabel="Distance en mètres"
              testID="distance-input"
            />
          </View>
          <View className="flex-1 gap-1">
            <AppText className="text-label text-content-secondary text-center">Durée (s)</AppText>
            <TextInput
              ref={field2Ref}
              value={durationSeconds}
              onChangeText={onDurationChange}
              keyboardType="number-pad"
              returnKeyType="done"
              onSubmitEditing={onSubmit}
              selectTextOnFocus
              className={inputClassName}
              style={inputStyle}
              placeholderTextColor={colors.contentMuted}
              placeholder="—"
              accessibilityLabel="Durée en secondes"
              testID="duration-input"
            />
          </View>
        </>
      )}
    </View>
  );
}
