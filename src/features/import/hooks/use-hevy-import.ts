import { useState, useCallback } from 'react';
import { useDB } from '@/hooks/use-db';
import { parseHevyCsv } from '../domain/hevy-csv-parser';
import { pickAndReadCsvFile } from '../api/read-csv-file';
import { getAllExerciseRefs } from '../api/get-exercises';
import { buildExerciseMappings } from '../domain/exercise-matcher';
import type { ImportState, ImportStep, ExerciseMatch } from '../types/import-state';

type UseHevyImportReturn = {
  state: ImportState;
  fileError: string | null;
  pickFile: () => Promise<void>;
  updateMapping: (hevyName: string, internalId: string | null, internalName: string | null) => void;
  toggleIgnore: (hevyName: string) => void;
  goToMapping: () => void;
  goToConfirmation: () => void;
  goBack: () => void;
  reset: () => void;
  unmappedCount: number;
};

const INITIAL_STATE: ImportState = {
  step: 'file_selection',
  fileName: null,
  fileContent: null,
  parsedData: null,
  exerciseMappings: [],
};

export function useHevyImport(): UseHevyImportReturn {
  const db = useDB();
  const [state, setState] = useState<ImportState>(INITIAL_STATE);
  const [fileError, setFileError] = useState<string | null>(null);

  const pickFile = useCallback(async () => {
    setFileError(null);
    const result = await pickAndReadCsvFile();

    if ('code' in result) {
      if (result.code === 'cancelled') return;
      if (result.code === 'not_csv') {
        setFileError(`Le fichier "${result.name}" n'est pas un fichier CSV.`);
        return;
      }
      if (result.code === 'read_failed') {
        setFileError('Impossible de lire le fichier. Vérifiez les permissions.');
        return;
      }
      return;
    }

    const parsed = parseHevyCsv(result.content);
    if (parsed.errors.length > 0 && parsed.sessions.length === 0) {
      setFileError(parsed.errors[0].message);
      return;
    }

    const exercises = await getAllExerciseRefs(db);
    const uniqueHevyNames = [...new Set(parsed.sessions.map((s) => s.exerciseName))];
    const rawMappings = buildExerciseMappings(uniqueHevyNames, exercises);

    const mappings: ExerciseMatch[] = rawMappings.map(({ hevyName, match }) => ({
      hevyName,
      internalId: match?.internalId ?? null,
      internalName: match?.internalName ?? null,
      score: match?.score ?? 0,
      ignored: false,
    }));

    setState({
      step: 'file_selection',
      fileName: result.name,
      fileContent: result.content,
      parsedData: parsed,
      exerciseMappings: mappings,
    });
  }, [db]);

  const updateMapping = useCallback(
    (hevyName: string, internalId: string | null, internalName: string | null) => {
      setState((prev) => ({
        ...prev,
        exerciseMappings: prev.exerciseMappings.map((m) =>
          m.hevyName === hevyName ? { ...m, internalId, internalName, ignored: false } : m,
        ),
      }));
    },
    [],
  );

  const toggleIgnore = useCallback((hevyName: string) => {
    setState((prev) => ({
      ...prev,
      exerciseMappings: prev.exerciseMappings.map((m) =>
        m.hevyName === hevyName ? { ...m, ignored: !m.ignored } : m,
      ),
    }));
  }, []);

  const goToStep = (step: ImportStep) => setState((prev) => ({ ...prev, step }));

  const goToMapping = useCallback(() => goToStep('exercise_mapping'), []);
  const goToConfirmation = useCallback(() => goToStep('confirmation'), []);

  const goBack = useCallback(() => {
    setState((prev) => {
      if (prev.step === 'exercise_mapping') return { ...prev, step: 'file_selection' };
      if (prev.step === 'confirmation') return { ...prev, step: 'exercise_mapping' };
      return prev;
    });
  }, []);

  const reset = useCallback(() => {
    setState(INITIAL_STATE);
    setFileError(null);
  }, []);

  const unmappedCount = state.exerciseMappings.filter(
    (m) => !m.ignored && m.internalId === null,
  ).length;

  return {
    state,
    fileError,
    pickFile,
    updateMapping,
    toggleIgnore,
    goToMapping,
    goToConfirmation,
    goBack,
    reset,
    unmappedCount,
  };
}
