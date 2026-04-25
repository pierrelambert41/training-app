import type { SQLiteDatabase } from 'expo-sqlite';
import type { SplitType } from '@/types';
import { insertProgram } from '@/services/programs';
import { insertBlock } from '@/services/blocks';
import { insertWorkoutDay } from '@/services/workout-days';
import { insertPlannedExercise } from '@/services/planned-exercises';

function devUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function seedActiveBlock(
  db: SQLiteDatabase,
  userId: string
): Promise<string> {
  await db.runAsync('UPDATE programs SET is_active = 0 WHERE user_id = ?', [userId]);

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

  const days: Array<{
    title: string;
    splitType: SplitType;
    durationMin: number;
    exercises: Array<{
      exerciseId: string;
      role: 'main' | 'secondary' | 'accessory';
      sets: number;
      repRangeMin: number;
      repRangeMax: number;
      targetRir: number;
      restSeconds: number;
    }>;
  }> = [
    {
      title: 'Push',
      splitType: 'push',
      durationMin: 60,
      exercises: [
        { exerciseId: 'd52484fe-8399-465a-ad20-f01d721e1407', role: 'main', sets: 4, repRangeMin: 6, repRangeMax: 8, targetRir: 2, restSeconds: 180 },
        { exerciseId: 'f47637c6-0736-47d5-ad55-4a49f63512a4', role: 'secondary', sets: 3, repRangeMin: 10, repRangeMax: 12, targetRir: 2, restSeconds: 120 },
        { exerciseId: '4d9aa851-3f43-4555-a71e-28c134f253fd', role: 'accessory', sets: 3, repRangeMin: 15, repRangeMax: 20, targetRir: 1, restSeconds: 60 },
      ],
    },
    {
      title: 'Pull',
      splitType: 'pull',
      durationMin: 60,
      exercises: [
        { exerciseId: 'cf1b00f2-44f5-4a66-9c15-6fca9edd77f9', role: 'main', sets: 4, repRangeMin: 6, repRangeMax: 8, targetRir: 2, restSeconds: 180 },
        { exerciseId: 'e59fd960-3d5e-4c35-9d48-cc0d8ed9bf5b', role: 'secondary', sets: 3, repRangeMin: 10, repRangeMax: 12, targetRir: 2, restSeconds: 120 },
        { exerciseId: '3b4f4e29-24aa-4c09-b7bb-66ba597077cd', role: 'accessory', sets: 3, repRangeMin: 12, repRangeMax: 15, targetRir: 1, restSeconds: 90 },
      ],
    },
    {
      title: 'Legs',
      splitType: 'legs',
      durationMin: 75,
      exercises: [
        { exerciseId: '2d2bf7c8-994c-4efa-b7a3-dff623de3058', role: 'main', sets: 4, repRangeMin: 5, repRangeMax: 8, targetRir: 2, restSeconds: 240 },
        { exerciseId: '89499f05-abe4-4dc4-b4c2-3127ef0b4d4d', role: 'secondary', sets: 3, repRangeMin: 10, repRangeMax: 12, targetRir: 2, restSeconds: 120 },
        { exerciseId: '6e02207d-b586-4f57-9bdc-c243d90f9825', role: 'accessory', sets: 3, repRangeMin: 10, repRangeMax: 12, targetRir: 1, restSeconds: 90 },
      ],
    },
  ];

  for (let i = 0; i < days.length; i++) {
    const day = days[i];
    const workoutDayId = devUuid();
    await insertWorkoutDay(db, {
      id: workoutDayId,
      blockId,
      title: day.title,
      dayOrder: i + 1,
      splitType: day.splitType,
      estimatedDurationMin: day.durationMin,
    });

    for (let j = 0; j < day.exercises.length; j++) {
      const ex = day.exercises[j];
      await insertPlannedExercise(db, {
        id: devUuid(),
        workoutDayId,
        exerciseId: ex.exerciseId,
        exerciseOrder: j + 1,
        role: ex.role,
        sets: ex.sets,
        repRangeMin: ex.repRangeMin,
        repRangeMax: ex.repRangeMax,
        targetRir: ex.targetRir,
        restSeconds: ex.restSeconds,
        progressionType: 'double_progression',
        progressionConfig: {},
      });
    }
  }

  return programId;
}
