import type { SQLiteDatabase } from 'expo-sqlite';
import type { SplitType } from '@/types';

function devUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}
import { insertProgram } from '@/services/programs';
import { insertBlock } from '@/services/blocks';
import { insertWorkoutDay } from '@/services/workout-days';

export async function seedActiveBlock(
  db: SQLiteDatabase,
  userId: string
): Promise<string> {
  const programId = devUuid();
  const blockId = devUuid();

  await insertProgram(db, {
    id: programId,
    userId,
    title: 'Programme test Push/Pull/Legs',
    goal: 'hypertrophy',
    frequency: 3,
    level: 'intermediate',
    isActive: true,
  });

  await insertBlock(db, {
    id: blockId,
    programId,
    title: 'Bloc hypertrophie — semaine 2',
    goal: 'hypertrophy',
    durationWeeks: 8,
    weekNumber: 2,
    startDate: new Date().toISOString(),
    status: 'active',
    deloadStrategy: 'fatigue_triggered',
  });

  const days: Array<{ title: string; splitType: SplitType; durationMin: number }> = [
    { title: 'Push', splitType: 'push', durationMin: 60 },
    { title: 'Pull', splitType: 'pull', durationMin: 60 },
    { title: 'Legs', splitType: 'legs', durationMin: 75 },
  ];

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    await insertWorkoutDay(db, {
      id: devUuid(),
      blockId,
      title: day.title,
      dayOrder: i + 1,
      splitType: day.splitType,
      estimatedDurationMin: day.durationMin,
    });
  }

  return programId;
}
