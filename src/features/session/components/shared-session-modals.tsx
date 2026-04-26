import { ExercisePickerModal } from './exercise-picker-modal';
import { AddUnplannedConfigModal } from './add-unplanned-config-modal';
import { SessionNotesBottomSheet } from '@/components/session/NoteBottomSheet';
import type { Exercise } from '@/types';
import type { UnplannedDefaults } from '../types/session-ui';

type SharedSessionModalsProps = {
  pickerVisible: boolean;
  configExercise: Exercise | null;
  sessionNotesVisible: boolean;
  preSessionNotes: string;
  postSessionNotes: string;
  onPickerSelect: (exercise: Exercise) => void;
  onPickerClose: () => void;
  onConfigConfirm: (config: UnplannedDefaults) => void;
  onConfigBack: () => void;
  onConfigClose: () => void;
  onNotesSave: (preNotes: string, postNotes: string) => void;
  onNotesClose: () => void;
};

export function SharedSessionModals({
  pickerVisible,
  configExercise,
  sessionNotesVisible,
  preSessionNotes,
  postSessionNotes,
  onPickerSelect,
  onPickerClose,
  onConfigConfirm,
  onConfigBack,
  onConfigClose,
  onNotesSave,
  onNotesClose,
}: SharedSessionModalsProps) {
  return (
    <>
      <ExercisePickerModal
        visible={pickerVisible}
        onSelect={onPickerSelect}
        onClose={onPickerClose}
      />
      <AddUnplannedConfigModal
        visible={configExercise !== null}
        exercise={configExercise}
        onConfirm={onConfigConfirm}
        onBack={onConfigBack}
        onClose={onConfigClose}
      />
      <SessionNotesBottomSheet
        visible={sessionNotesVisible}
        initialPreNotes={preSessionNotes}
        initialPostNotes={postSessionNotes}
        onSave={onNotesSave}
        onClose={onNotesClose}
      />
    </>
  );
}
