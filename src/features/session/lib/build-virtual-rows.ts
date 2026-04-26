import type { SetLog } from '@/types';
import type { VirtualSetRow } from '../types/session-ui';

export function buildVirtualRows(
  plannedSets: number,
  isUnilateral: boolean,
  exerciseSetLogs: SetLog[]
): VirtualSetRow[] {
  if (!isUnilateral) {
    return Array.from({ length: plannedSets }, (_, i) => {
      const setNum = i + 1;
      const log = exerciseSetLogs.find((sl) => sl.setNumber === setNum && sl.side === null) ?? null;
      return { setNumber: setNum, side: null, log };
    });
  }

  const rows: VirtualSetRow[] = [];
  for (let i = 1; i <= plannedSets; i++) {
    const logLeft = exerciseSetLogs.find((sl) => sl.setNumber === i && sl.side === 'left') ?? null;
    const logRight = exerciseSetLogs.find((sl) => sl.setNumber === i && sl.side === 'right') ?? null;
    rows.push({ setNumber: i, side: 'left', log: logLeft });
    rows.push({ setNumber: i, side: 'right', log: logRight });
  }
  return rows;
}
