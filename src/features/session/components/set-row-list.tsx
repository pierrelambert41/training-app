import { View } from 'react-native';
import { AppText } from '@/components/ui';
import { SetNoteBottomSheet } from '@/components/session/NoteBottomSheet';
import { SetRow } from './set-row';
import { InlineSetEditor } from './inline-set-editor';
import type { EditSetPayload } from '@/stores/session-store';
import type { LogType, SetLog } from '@/types';
import type { VirtualSetRow } from '../types/session-ui';
import type { SQLiteDatabase } from 'expo-sqlite';

type SetRowListProps = {
  virtualRows: VirtualSetRow[];
  allSetsLogged: boolean;
  nextVirtual: VirtualSetRow | null;
  logType: LogType;
  prefillLoad: number | null;
  targetReps: number | null;
  targetRir: number | null;
  editingSetId: string | null;
  noteSetId: string | null;
  exerciseSetLogs: SetLog[];
  db: SQLiteDatabase;
  onSetTap: (rowLog: SetLog, isEditing: boolean) => void;
  onNoteTap: (logId: string) => void;
  onEditSave: (setLogId: string, payload: EditSetPayload) => void;
  onEditDelete: (setLogId: string) => void;
  onEditCancel: () => void;
  onNoteClose: () => void;
  onNoteSave: (note: string) => void;
};

const col1HeaderFor = (logType: LogType): string => {
  if (logType === 'duration') return 'Durée';
  if (logType === 'distance_duration') return 'Dist.';
  return 'Charge';
};

const col2HeaderFor = (logType: LogType): string => {
  if (logType === 'distance_duration') return 'Durée';
  if (logType === 'duration') return '';
  return 'Reps';
};

export function SetRowList({
  virtualRows,
  allSetsLogged,
  nextVirtual,
  logType,
  prefillLoad,
  targetReps,
  targetRir,
  editingSetId,
  noteSetId,
  exerciseSetLogs,
  onSetTap,
  onNoteTap,
  onEditSave,
  onEditDelete,
  onEditCancel,
  onNoteClose,
  onNoteSave,
}: SetRowListProps) {
  const col1Header = col1HeaderFor(logType);
  const col2Header = col2HeaderFor(logType);
  const noteLog = noteSetId ? exerciseSetLogs.find((sl) => sl.id === noteSetId) ?? null : null;

  return (
    <View className="gap-1">
      <View className="flex-row px-4 mb-1">
        <View className="w-8" />
        <AppText className="flex-1 text-caption text-content-muted text-center">
          {col1Header}
        </AppText>
        {col2Header !== '' && (
          <AppText className="flex-1 text-caption text-content-muted text-center">
            {col2Header}
          </AppText>
        )}
        {col2Header === '' && <View className="flex-1" />}
        {logType !== 'duration' && logType !== 'distance_duration' ? (
          <AppText className="w-12 text-caption text-content-muted text-center">RIR</AppText>
        ) : (
          <View className="w-12" />
        )}
      </View>

      {virtualRows.map((vr) => {
        const rowKey = vr.side ? `${vr.setNumber}-${vr.side}` : `${vr.setNumber}`;
        const isCurrent = !allSetsLogged && nextVirtual?.setNumber === vr.setNumber && nextVirtual?.side === vr.side;
        const isEditing = vr.log !== null && editingSetId === vr.log.id;

        return (
          <View key={rowKey}>
            <SetRow
              setNumber={vr.setNumber}
              side={vr.side}
              log={vr.log}
              logType={logType}
              targetLoad={logType === 'weight_reps' ? prefillLoad : null}
              targetReps={targetReps}
              targetRir={targetRir}
              isCurrent={isCurrent}
              isEditing={isEditing}
              onTap={() => {
                if (vr.log && vr.log.completed) onSetTap(vr.log, isEditing);
              }}
              onNoteTap={() => {
                if (vr.log) onNoteTap(vr.log.id);
              }}
            />
            {isEditing && vr.log ? (
              <InlineSetEditor
                log={vr.log}
                logType={logType}
                targetReps={targetReps}
                onSave={(payload) => onEditSave(vr.log!.id, payload)}
                onDelete={() => onEditDelete(vr.log!.id)}
                onCancel={onEditCancel}
              />
            ) : null}
          </View>
        );
      })}

      <SetNoteBottomSheet
        visible={noteSetId !== null}
        initialNote={noteLog?.notes ?? ''}
        onSave={onNoteSave}
        onClose={onNoteClose}
      />
    </View>
  );
}
