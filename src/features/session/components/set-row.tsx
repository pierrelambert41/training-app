import { Pressable, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';
import { repsColor } from '../lib/reps-color';
import { SetRowInlineForm } from './set-row-inline-form';
import type { InlineLogValues } from './set-row-inline-form';
import type { LogType, SetLog, SetLogSide } from '@/types';

export type SetRowProps = {
  setNumber: number;
  side: SetLogSide | null;
  log: SetLog | null;
  logType: LogType;
  targetLoad: number | null;
  targetReps: number | null;
  targetRir: number | null;
  isCurrent: boolean;
  isEditing: boolean;
  prefillLoad: string;
  prefillReps: string;
  prefillDuration: string;
  prefillDistance: string;
  onTap: () => void;
  onNoteTap: () => void;
  onInlineLog: (values: InlineLogValues) => void;
};

export function SetRow({
  setNumber,
  side,
  log,
  logType,
  targetLoad,
  targetReps,
  targetRir,
  isCurrent,
  isEditing,
  prefillLoad,
  prefillReps,
  prefillDuration,
  prefillDistance,
  onTap,
  onNoteTap,
  onInlineLog,
}: SetRowProps) {
  const isLogged = log !== null && log.completed;

  const rowBg = isEditing
    ? 'bg-background-elevated border border-accent'
    : isCurrent
    ? 'bg-background-elevated border border-border'
    : isLogged
    ? 'bg-background-surface opacity-60'
    : 'bg-background-surface';

  const sideLabel = side === 'left' ? 'G' : side === 'right' ? 'D' : null;
  const sideColor = side === 'left' ? '#60a5fa' : '#f97316';

  const col1Display = isLogged
    ? (() => {
        if (logType === 'duration') return log.durationSeconds !== null ? String(log.durationSeconds) : '—';
        if (logType === 'distance_duration') return log.distanceMeters !== null ? String(log.distanceMeters) : '—';
        return log.load !== null ? String(log.load) : '—';
      })()
    : (() => {
        if (logType === 'duration') return '—';
        if (logType === 'distance_duration') return '—';
        return targetLoad !== null ? String(targetLoad) : '—';
      })();

  const col1Label = (() => {
    if (logType === 'duration') return 's';
    if (logType === 'distance_duration') return 'm';
    if (logType === 'bodyweight_reps') return 'lest';
    return 'kg';
  })();

  const col2Display = isLogged
    ? (() => {
        if (logType === 'distance_duration') return log.durationSeconds !== null ? String(log.durationSeconds) : '—';
        return log.reps !== null ? String(log.reps) : '—';
      })()
    : (() => {
        if (logType === 'distance_duration') return '—';
        return targetReps !== null ? `${targetReps}` : '—';
      })();

  const col2Label = logType === 'distance_duration' ? 's' : 'reps';
  const showCol2 = logType !== 'duration';
  const showRir = logType !== 'duration' && logType !== 'distance_duration';

  const rirDisplay = isLogged
    ? log.rir !== null ? String(log.rir) : '—'
    : targetRir !== null ? String(targetRir) : '—';

  const repColor = isLogged && showCol2
    ? repsColor(
        logType === 'distance_duration' ? null : log?.reps ?? null,
        logType === 'distance_duration' ? null : targetReps
      )
    : colors.contentSecondary;

  const hasNote = isLogged && (log?.notes ?? '').length > 0;
  const testIdSuffix = side ? `${setNumber}-${side}` : `${setNumber}`;

  if (!isLogged && isCurrent) {
    return (
      <View
        className={`flex-row items-center rounded-card px-3 py-2 mb-2 gap-2 ${rowBg}`}
        testID={`set-row-current-${testIdSuffix}`}
      >
        <View className="w-8 items-center">
          {sideLabel !== null ? (
            <AppText className="text-body font-bold" style={{ color: sideColor }}>
              {sideLabel}
            </AppText>
          ) : (
            <AppText className="text-body font-semibold text-accent">{setNumber}</AppText>
          )}
        </View>
        <SetRowInlineForm
          logType={logType}
          side={side}
          prefillLoad={prefillLoad}
          prefillReps={prefillReps}
          prefillDuration={prefillDuration}
          prefillDistance={prefillDistance}
          prefillRir={targetRir}
          onLog={onInlineLog}
        />
        <View className="w-8" />
      </View>
    );
  }

  if (!isLogged) {
    return (
      <View
        className={`flex-row items-center rounded-card px-4 py-3 mb-2 ${rowBg}`}
        testID={`set-row-pending-${testIdSuffix}`}
      >
        <View className="w-8 items-center">
          {sideLabel !== null ? (
            <AppText className="text-body font-bold" style={{ color: colors.contentMuted }}>
              {sideLabel}
            </AppText>
          ) : (
            <AppText className="text-body font-semibold text-content-muted">{setNumber}</AppText>
          )}
        </View>
        <View className="flex-1 items-center">
          <AppText className="text-logger font-semibold text-content-muted">{col1Display}</AppText>
          <AppText className="text-caption text-content-muted">{col1Label}</AppText>
        </View>
        {showCol2 ? (
          <View className="flex-1 items-center">
            <AppText className="text-logger font-semibold text-content-muted">{col2Display}</AppText>
            <AppText className="text-caption text-content-muted">{col2Label}</AppText>
          </View>
        ) : (
          <View className="flex-1" />
        )}
        {showRir ? (
          <View className="w-12 items-center">
            <AppText className="text-body font-medium text-content-muted">{rirDisplay}</AppText>
            <AppText className="text-caption text-content-muted">RIR</AppText>
          </View>
        ) : (
          <View className="w-12" />
        )}
        <View style={{ minWidth: 44 }} />
      </View>
    );
  }

  const accessibilityLabel = side
    ? `Modifier le set ${setNumber} côté ${side === 'left' ? 'gauche' : 'droit'}`
    : `Modifier le set ${setNumber}`;

  const rowContent = (
    <View className={`flex-row items-center rounded-card px-4 py-3 ${rowBg}`}>
      <View className="w-8 items-center">
        <AppText className="text-status-success text-body font-semibold">✓</AppText>
      </View>

      <View className="flex-1 items-center">
        <AppText className="text-logger font-semibold text-content-primary">{col1Display}</AppText>
        <AppText className="text-caption text-content-muted">{col1Label}</AppText>
      </View>

      {showCol2 ? (
        <View className="flex-1 items-center">
          <AppText className="text-logger font-semibold" style={{ color: isLogged ? repColor : colors.contentMuted }}>
            {col2Display}
          </AppText>
          <AppText className="text-caption text-content-muted">{col2Label}</AppText>
        </View>
      ) : (
        <View className="flex-1" />
      )}

      {showRir ? (
        <View className="w-12 items-center">
          <AppText className="text-body font-medium text-content-secondary">{rirDisplay}</AppText>
          <AppText className="text-caption text-content-muted">RIR</AppText>
        </View>
      ) : (
        <View className="w-12" />
      )}

      <Pressable
        onPress={onNoteTap}
        style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
        accessibilityLabel={`Note du set ${testIdSuffix}`}
        accessibilityRole="button"
        testID={`set-note-button-${testIdSuffix}`}
        hitSlop={4}
      >
        <AppText style={{ fontSize: 18, color: hasNote ? colors.accent : colors.contentMuted }}>
          {hasNote ? '💬' : '○'}
        </AppText>
      </Pressable>
    </View>
  );

  return (
    <Pressable
      onPress={onTap}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      style={{ minHeight: 44 }}
      className="mb-2"
    >
      {rowContent}
    </Pressable>
  );
}
