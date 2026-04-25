import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/theme/tokens';

const NOTE_MAX_LENGTH = 500;

// ---------------------------------------------------------------------------
// SetNoteBottomSheet
// ---------------------------------------------------------------------------

type SetNoteBottomSheetProps = {
  visible: boolean;
  initialNote: string;
  onSave: (note: string) => void;
  onClose: () => void;
};

export function SetNoteBottomSheet({
  visible,
  initialNote,
  onSave,
  onClose,
}: SetNoteBottomSheetProps) {
  const [note, setNote] = useState(initialNote);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setNote(initialNote);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, initialNote]);

  function handleSave() {
    onSave(note.trim());
    Keyboard.dismiss();
    onClose();
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 bg-black/50"
        onPress={handleClose}
        accessibilityLabel="Fermer"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="absolute bottom-0 left-0 right-0"
      >
        <View className="bg-background-elevated rounded-t-2xl px-4 pt-4 pb-8 gap-4">
          <View className="flex-row items-center justify-between">
            <AppText className="text-heading font-bold text-content-primary">
              Note du set
            </AppText>
            <Pressable
              onPress={handleClose}
              style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
              accessibilityLabel="Annuler"
              testID="set-note-cancel"
            >
              <AppText className="text-body text-content-muted">Annuler</AppText>
            </Pressable>
          </View>

          <TextInput
            ref={inputRef}
            value={note}
            onChangeText={(v) => setNote(v.slice(0, NOTE_MAX_LENGTH))}
            multiline
            numberOfLines={3}
            returnKeyType="default"
            style={{
              minHeight: 80,
              maxHeight: 120,
              fontSize: 15,
              color: colors.contentPrimary,
              backgroundColor: '#1a2035',
              borderRadius: 10,
              borderWidth: 1,
              borderColor: '#2a3555',
              paddingHorizontal: 12,
              paddingVertical: 10,
              textAlignVertical: 'top',
            }}
            placeholderTextColor={colors.contentMuted}
            placeholder="…"
            accessibilityLabel="Note du set"
            testID="set-note-input"
          />

          <View className="flex-row items-center justify-between">
            <AppText className="text-caption text-content-muted">
              {note.length}/{NOTE_MAX_LENGTH}
            </AppText>
            <Pressable
              onPress={handleSave}
              style={{ minHeight: 44, minWidth: 100, justifyContent: 'center', alignItems: 'center' }}
              className="rounded-button bg-accent"
              accessibilityLabel="Enregistrer la note"
              testID="set-note-save"
            >
              <AppText className="text-label font-bold text-content-on-accent">
                Enregistrer
              </AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// SessionNotesBottomSheet
// ---------------------------------------------------------------------------

type SessionNotesBottomSheetProps = {
  visible: boolean;
  initialPreNotes: string;
  initialPostNotes: string;
  onSave: (preNotes: string, postNotes: string) => void;
  onClose: () => void;
};

export function SessionNotesBottomSheet({
  visible,
  initialPreNotes,
  initialPostNotes,
  onSave,
  onClose,
}: SessionNotesBottomSheetProps) {
  const [preNotes, setPreNotes] = useState(initialPreNotes);
  const [postNotes, setPostNotes] = useState(initialPostNotes);

  useEffect(() => {
    if (visible) {
      setPreNotes(initialPreNotes);
      setPostNotes(initialPostNotes);
    }
  }, [visible, initialPreNotes, initialPostNotes]);

  function handleSave() {
    onSave(preNotes.trim(), postNotes.trim());
    Keyboard.dismiss();
    onClose();
  }

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable
        className="flex-1 bg-black/50"
        onPress={handleClose}
        accessibilityLabel="Fermer"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="absolute bottom-0 left-0 right-0"
      >
        <View className="bg-background-elevated rounded-t-2xl px-4 pt-4 pb-8 gap-4">
          <View className="flex-row items-center justify-between">
            <AppText className="text-heading font-bold text-content-primary">
              Notes de séance
            </AppText>
            <Pressable
              onPress={handleClose}
              style={{ minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' }}
              accessibilityLabel="Annuler"
              testID="session-notes-cancel"
            >
              <AppText className="text-body text-content-muted">Annuler</AppText>
            </Pressable>
          </View>

          <View className="gap-2">
            <AppText className="text-label text-content-secondary">Avant la séance</AppText>
            <TextInput
              value={preNotes}
              onChangeText={(v) => setPreNotes(v.slice(0, NOTE_MAX_LENGTH))}
              multiline
              numberOfLines={3}
              style={{
                minHeight: 72,
                maxHeight: 100,
                fontSize: 15,
                color: colors.contentPrimary,
                backgroundColor: '#1a2035',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#2a3555',
                paddingHorizontal: 12,
                paddingVertical: 10,
                textAlignVertical: 'top',
              }}
              placeholderTextColor={colors.contentMuted}
              placeholder="…"
              accessibilityLabel="Notes avant séance"
              testID="pre-session-notes-input"
            />
          </View>

          <View className="gap-2">
            <AppText className="text-label text-content-secondary">Après la séance</AppText>
            <TextInput
              value={postNotes}
              onChangeText={(v) => setPostNotes(v.slice(0, NOTE_MAX_LENGTH))}
              multiline
              numberOfLines={3}
              style={{
                minHeight: 72,
                maxHeight: 100,
                fontSize: 15,
                color: colors.contentPrimary,
                backgroundColor: '#1a2035',
                borderRadius: 10,
                borderWidth: 1,
                borderColor: '#2a3555',
                paddingHorizontal: 12,
                paddingVertical: 10,
                textAlignVertical: 'top',
              }}
              placeholderTextColor={colors.contentMuted}
              placeholder="…"
              accessibilityLabel="Notes après séance"
              testID="post-session-notes-input"
            />
          </View>

          <Pressable
            onPress={handleSave}
            style={{ minHeight: 48, justifyContent: 'center', alignItems: 'center' }}
            className="rounded-button bg-accent"
            accessibilityLabel="Enregistrer les notes"
            testID="session-notes-save"
          >
            <AppText className="text-label font-bold text-content-on-accent">
              Enregistrer
            </AppText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
