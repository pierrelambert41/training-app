import { useMemo } from 'react';
import type { SetLog, SetLogSide } from '@/types';

type PrefillResult = {
  prefillLoad: number | null;
  prefillReps: number | null;
  prefillRir: number | null;
  prefillDuration: number | null;
  prefillDistance: number | null;
  previousSetLog: SetLog | null;
};

type PrefillParams = {
  exerciseSetLogs: SetLog[];
  editingSetId: string | null;
  currentSide: SetLogSide | null;
  lastSet: SetLog | null;
  lastSetLeft: SetLog | null;
  lastSetRight: SetLog | null;
  repRangeMin: number;
  targetRir: number | null;
};

function getLastLoggedBySide(
  exerciseSetLogs: SetLog[],
  editingSetId: string | null,
  side: SetLogSide | null
): SetLog | null {
  if (side === null) return exerciseSetLogs.filter((sl) => sl.id !== editingSetId).at(-1) ?? null;
  return exerciseSetLogs.filter((sl) => sl.side === side && sl.id !== editingSetId).at(-1) ?? null;
}

function getHistoryBySide(
  side: SetLogSide | null,
  lastSet: SetLog | null,
  lastSetLeft: SetLog | null,
  lastSetRight: SetLog | null
): SetLog | null {
  if (side === 'left') return lastSetLeft;
  if (side === 'right') return lastSetRight;
  return lastSet;
}

export function useExercisePagePrefill({
  exerciseSetLogs,
  editingSetId,
  currentSide,
  lastSet,
  lastSetLeft,
  lastSetRight,
  repRangeMin,
  targetRir,
}: PrefillParams): PrefillResult {
  const previousSetLog = useMemo(
    () => getLastLoggedBySide(exerciseSetLogs, editingSetId, currentSide),
    [exerciseSetLogs, editingSetId, currentSide]
  );

  const prefillLoad = useMemo(() => {
    const lastLogged = getLastLoggedBySide(exerciseSetLogs, editingSetId, currentSide);
    if (lastLogged?.load !== null && lastLogged?.load !== undefined) return lastLogged.load;
    const hist = getHistoryBySide(currentSide, lastSet, lastSetLeft, lastSetRight);
    if (hist?.load !== null && hist?.load !== undefined) return hist.load;
    return null;
  }, [exerciseSetLogs, editingSetId, currentSide, lastSet, lastSetLeft, lastSetRight]);

  const prefillReps = useMemo(() => {
    const lastLogged = getLastLoggedBySide(exerciseSetLogs, editingSetId, currentSide);
    if (lastLogged?.reps !== null && lastLogged?.reps !== undefined) return lastLogged.reps;
    const hist = getHistoryBySide(currentSide, lastSet, lastSetLeft, lastSetRight);
    if (hist?.reps !== null && hist?.reps !== undefined) return hist.reps;
    return repRangeMin;
  }, [exerciseSetLogs, editingSetId, currentSide, lastSet, lastSetLeft, lastSetRight, repRangeMin]);

  const prefillRir = useMemo(() => {
    const lastLogged = getLastLoggedBySide(exerciseSetLogs, editingSetId, currentSide);
    if (lastLogged?.rir !== null && lastLogged?.rir !== undefined) return lastLogged.rir;
    const hist = getHistoryBySide(currentSide, lastSet, lastSetLeft, lastSetRight);
    if (hist?.rir !== null && hist?.rir !== undefined) return hist.rir;
    return targetRir ?? null;
  }, [exerciseSetLogs, editingSetId, currentSide, lastSet, lastSetLeft, lastSetRight, targetRir]);

  const prefillDuration = useMemo(() => {
    const lastLogged = getLastLoggedBySide(exerciseSetLogs, editingSetId, currentSide);
    if (lastLogged?.durationSeconds !== null && lastLogged?.durationSeconds !== undefined) return lastLogged.durationSeconds;
    const hist = getHistoryBySide(currentSide, lastSet, lastSetLeft, lastSetRight);
    return hist?.durationSeconds ?? null;
  }, [exerciseSetLogs, editingSetId, currentSide, lastSet, lastSetLeft, lastSetRight]);

  const prefillDistance = useMemo(() => {
    const lastLogged = getLastLoggedBySide(exerciseSetLogs, editingSetId, currentSide);
    if (lastLogged?.distanceMeters !== null && lastLogged?.distanceMeters !== undefined) return lastLogged.distanceMeters;
    const hist = getHistoryBySide(currentSide, lastSet, lastSetLeft, lastSetRight);
    return hist?.distanceMeters ?? null;
  }, [exerciseSetLogs, editingSetId, currentSide, lastSet, lastSetLeft, lastSetRight]);

  return {
    prefillLoad,
    prefillReps,
    prefillRir,
    prefillDuration,
    prefillDistance,
    previousSetLog,
  };
}
