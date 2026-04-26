import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, TextInput, View } from 'react-native';
import { AppText } from '@/components/ui';
import { RirSelector } from './rir-selector';
import { LogSetFields } from './log-set-fields';
import type { LogType, PlannedExercise, SetLog, SetLogSide } from '@/types';

export type LogSetFormProps = {
  logType: LogType;
  side: SetLogSide | null;
  plannedExercise: PlannedExercise;
  prefillLoad: number | null;
  prefillReps: number | null;
  prefillRir: number | null;
  prefillDuration: number | null;
  prefillDistance: number | null;
  previousSetLog: SetLog | null;
  onLog: (values: {
    load: number | null;
    reps: number | null;
    rir: number | null;
    durationSeconds: number | null;
    distanceMeters: number | null;
    side: SetLogSide | null;
  }) => void;
  disabled: boolean;
};

export function LogSetForm({
  logType,
  side,
  plannedExercise,
  prefillLoad,
  prefillReps,
  prefillRir,
  prefillDuration,
  prefillDistance,
  previousSetLog,
  onLog,
  disabled,
}: LogSetFormProps) {
  const field1Ref = useRef<TextInput>(null);
  const field2Ref = useRef<TextInput>(null);

  const [load, setLoad] = useState<string>(prefillLoad !== null ? String(prefillLoad) : '');
  const [reps, setReps] = useState<string>(prefillReps !== null ? String(prefillReps) : '');
  const [durationSeconds, setDurationSeconds] = useState<string>(prefillDuration !== null ? String(prefillDuration) : '');
  const [distanceMeters, setDistanceMeters] = useState<string>(prefillDistance !== null ? String(prefillDistance) : '');
  const [rir, setRir] = useState<number | null>(prefillRir);

  useEffect(() => {
    setLoad(prefillLoad !== null ? String(prefillLoad) : '');
    setReps(prefillReps !== null ? String(prefillReps) : '');
    setRir(prefillRir);
    setDurationSeconds(prefillDuration !== null ? String(prefillDuration) : '');
    setDistanceMeters(prefillDistance !== null ? String(prefillDistance) : '');
  }, [prefillLoad, prefillReps, prefillRir, prefillDuration, prefillDistance]);

  const parsedLoad = load.length > 0 ? parseFloat(load) : null;
  const parsedReps = reps.length > 0 ? parseInt(reps, 10) : null;
  const parsedDuration = durationSeconds.length > 0 ? parseInt(durationSeconds, 10) : null;
  const parsedDistance = distanceMeters.length > 0 ? parseFloat(distanceMeters) : null;

  const canLog = !disabled && (() => {
    if (logType === 'weight_reps') return parsedLoad !== null && !isNaN(parsedLoad) && parsedReps !== null && parsedReps > 0;
    if (logType === 'bodyweight_reps') return parsedReps !== null && parsedReps > 0;
    if (logType === 'duration') return parsedDuration !== null && parsedDuration > 0;
    if (logType === 'distance_duration') return parsedDistance !== null && parsedDistance > 0 && parsedDuration !== null && parsedDuration > 0;
    return false;
  })();

  function handleLog() {
    if (!canLog) return;
    Keyboard.dismiss();
    onLog({
      load: logType === 'weight_reps' ? parsedLoad : logType === 'bodyweight_reps' ? (parsedLoad ?? null) : null,
      reps: (logType === 'weight_reps' || logType === 'bodyweight_reps') ? parsedReps : null,
      rir,
      durationSeconds: (logType === 'duration' || logType === 'distance_duration') ? parsedDuration : null,
      distanceMeters: logType === 'distance_duration' ? parsedDistance : null,
      side,
    });
    if (logType === 'weight_reps' || logType === 'bodyweight_reps') {
      setReps(plannedExercise.repRangeMin !== null ? String(plannedExercise.repRangeMin) : '');
    }
    if (logType === 'duration' || logType === 'distance_duration') {
      setDurationSeconds(prefillDuration !== null ? String(prefillDuration) : '');
    }
    if (logType === 'distance_duration') {
      setDistanceMeters(prefillDistance !== null ? String(prefillDistance) : '');
    }
  }

  function handleRepeatPrevious() {
    if (!previousSetLog) return;
    setLoad(previousSetLog.load !== null ? String(previousSetLog.load) : '');
    setReps(previousSetLog.reps !== null ? String(previousSetLog.reps) : '');
    setDurationSeconds(previousSetLog.durationSeconds !== null ? String(previousSetLog.durationSeconds) : '');
    setDistanceMeters(previousSetLog.distanceMeters !== null ? String(previousSetLog.distanceMeters) : '');
    setRir(previousSetLog.rir);
  }

  const repeatSummary = (() => {
    if (!previousSetLog) return '';
    if (logType === 'weight_reps') return `${previousSetLog.load ?? '—'}kg × ${previousSetLog.reps ?? '—'}${previousSetLog.rir !== null ? ` · RIR ${previousSetLog.rir}` : ''}`;
    if (logType === 'bodyweight_reps') return `${previousSetLog.reps ?? '—'} reps${previousSetLog.load ? ` + ${previousSetLog.load}kg` : ''}`;
    if (logType === 'duration') return `${previousSetLog.durationSeconds ?? '—'}s`;
    if (logType === 'distance_duration') return `${previousSetLog.distanceMeters ?? '—'}m · ${previousSetLog.durationSeconds ?? '—'}s`;
    return '';
  })();

  const sideLabel = side === 'left' ? 'GAUCHE' : side === 'right' ? 'DROIT' : null;
  const sideColor = side === 'left' ? '#60a5fa' : '#f97316';

  return (
    <View className="gap-4">
      {sideLabel !== null && (
        <View className="items-center">
          <AppText
            className="text-label font-bold tracking-widest"
            style={{ color: sideColor }}
          >
            {sideLabel}
          </AppText>
        </View>
      )}

      {previousSetLog !== null ? (
        <Pressable
          onPress={handleRepeatPrevious}
          style={{ minHeight: 44 }}
          className="rounded-button items-center justify-center bg-background-surface border border-border flex-row gap-2"
          accessibilityLabel="Répéter le set précédent"
          testID="repeat-previous-button"
        >
          <AppText className="text-label font-semibold text-content-secondary">
            ↩ Repeat previous set
          </AppText>
          <AppText className="text-caption text-content-muted">{repeatSummary}</AppText>
        </Pressable>
      ) : null}

      <LogSetFields
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
        onSubmit={handleLog}
      />

      {logType !== 'duration' && logType !== 'distance_duration' && (
        <View className="gap-2">
          <AppText className="text-label text-content-secondary">RIR (répétitions en réserve)</AppText>
          <RirSelector value={rir} onChange={setRir} />
        </View>
      )}

      <Pressable
        onPress={handleLog}
        disabled={!canLog}
        className={`h-18 rounded-button items-center justify-center ${canLog ? 'bg-accent' : 'bg-background-elevated'}`}
        accessibilityLabel="Logger le set"
        testID="log-set-button"
      >
        <AppText className={`text-heading font-bold ${canLog ? 'text-content-on-accent' : 'text-content-muted'}`}>
          LOG SET
        </AppText>
      </Pressable>
    </View>
  );
}
