import type { SQLiteDatabase } from 'expo-sqlite';
import type { SplitType } from '@/types';
import { insertProgram } from '@/services/programs';
import { insertBlock } from '@/services/blocks';
import { insertWorkoutDay } from '@/services/workout-days';

function devUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

function mondayOf(isoDate: string): Date {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  const jsDay = d.getUTCDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  return new Date(d.getTime() + diff * DAY_MS);
}

/** Bruit déterministe-ish autour de 0 (±amplitude). */
function noise(amplitude: number): number {
  return (Math.random() * 2 - 1) * amplitude;
}

type SeedExercise = {
  exerciseId: string;
  sets: number;
  /** Charge de départ (kg). null = poids de corps (pull-up). */
  baseLoad: number | null;
  /** Incrément de charge par semaine (kg). */
  weeklyIncrement: number;
  repsMin: number;
  repsMax: number;
};

type SeedDay = {
  title: string;
  splitType: SplitType;
  /** Décalage depuis le lundi (0 = lundi, 2 = mercredi, 4 = vendredi). */
  weekdayOffset: number;
  exercises: SeedExercise[];
};

// Mêmes exercices seed que seed-active-block (présents dans la migration v2).
const DAYS: SeedDay[] = [
  {
    title: 'Push',
    splitType: 'push',
    weekdayOffset: 0,
    exercises: [
      { exerciseId: 'd52484fe-8399-465a-ad20-f01d721e1407', sets: 4, baseLoad: 80, weeklyIncrement: 1.25, repsMin: 6, repsMax: 8 }, // Bench
      { exerciseId: 'f47637c6-0736-47d5-ad55-4a49f63512a4', sets: 3, baseLoad: 24, weeklyIncrement: 0.5, repsMin: 10, repsMax: 12 }, // Shoulder press
      { exerciseId: '4d9aa851-3f43-4555-a71e-28c134f253fd', sets: 3, baseLoad: 10, weeklyIncrement: 0.25, repsMin: 15, repsMax: 20 }, // Lateral raise
    ],
  },
  {
    title: 'Pull',
    splitType: 'pull',
    weekdayOffset: 2,
    exercises: [
      { exerciseId: 'cf1b00f2-44f5-4a66-9c15-6fca9edd77f9', sets: 4, baseLoad: null, weeklyIncrement: 0, repsMin: 6, repsMax: 10 }, // Pull-up
      { exerciseId: 'e59fd960-3d5e-4c35-9d48-cc0d8ed9bf5b', sets: 3, baseLoad: 70, weeklyIncrement: 1.25, repsMin: 10, repsMax: 12 }, // Cable row
      { exerciseId: '3b4f4e29-24aa-4c09-b7bb-66ba597077cd', sets: 3, baseLoad: 65, weeklyIncrement: 1, repsMin: 12, repsMax: 15 }, // Lat pulldown
    ],
  },
  {
    title: 'Legs',
    splitType: 'legs',
    weekdayOffset: 4,
    exercises: [
      { exerciseId: '2d2bf7c8-994c-4efa-b7a3-dff623de3058', sets: 4, baseLoad: 100, weeklyIncrement: 2.5, repsMin: 5, repsMax: 8 }, // Squat
      { exerciseId: '89499f05-abe4-4dc4-b4c2-3127ef0b4d4d', sets: 3, baseLoad: 180, weeklyIncrement: 2.5, repsMin: 10, repsMax: 12 }, // Leg press
      { exerciseId: '6e02207d-b586-4f57-9bdc-c243d90f9825', sets: 3, baseLoad: 90, weeklyIncrement: 1.25, repsMin: 10, repsMax: 12 }, // RDL
    ],
  },
];

const WEEKS_OF_HISTORY = 9;
/** Semaine 5 du seed = deload : charges -10 %, fatigue qui retombe. */
const DELOAD_WEEK_INDEX = 4;
/** Séances Pull sautées ces semaines-là (compliance ≈ 85 %, jours "manqués"). */
const SKIPPED = new Set(['2-Pull', '6-Pull']);

/**
 * Seed DEV uniquement : remplit ~9 semaines d'historique réaliste pour
 * visualiser le dashboard Progrès (e1RM, volume/muscle, poids, fatigue,
 * compliance) et la vue semaine du bloc.
 *
 * Inserts SQL bruts SANS safeEnqueue : ces données mock ne doivent jamais
 * partir en sync vers Supabase (contrairement aux services normaux).
 * Le programme/bloc passe par les services (cohérent avec seed-active-block).
 */
export async function seedAnalyticsHistory(
  db: SQLiteDatabase,
  userId: string
): Promise<{ sessions: number; sets: number; weighIns: number; checkins: number }> {
  await db.runAsync('UPDATE programs SET is_active = 0 WHERE user_id = ?', [userId]);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonday = mondayOf(today);
  const blockStartMonday = new Date(
    currentMonday.getTime() - (WEEKS_OF_HISTORY - 1) * 7 * DAY_MS
  );

  const programId = devUuid();
  const blockId = devUuid();

  await insertProgram(db, {
    id: programId,
    userId,
    title: 'Programme mock analytics (PPL)',
    goal: 'hypertrophy',
    frequency: 3,
    level: 'intermediate',
    isActive: true,
  });

  await insertBlock(db, {
    id: blockId,
    programId,
    title: 'Bloc hypertrophie — historique mock',
    goal: 'hypertrophy',
    durationWeeks: 12,
    weekNumber: WEEKS_OF_HISTORY,
    startDate: blockStartMonday.toISOString().slice(0, 10),
    status: 'active',
    deloadStrategy: 'fatigue_triggered',
  });

  const workoutDayIds = new Map<string, string>();
  for (let i = 0; i < DAYS.length; i++) {
    const workoutDayId = devUuid();
    workoutDayIds.set(DAYS[i].title, workoutDayId);
    await insertWorkoutDay(db, {
      id: workoutDayId,
      blockId,
      title: DAYS[i].title,
      dayOrder: DAYS[i].weekdayOffset + 1,
      splitType: DAYS[i].splitType,
      estimatedDurationMin: 60,
    });
  }

  let sessionCount = 0;
  let setCount = 0;

  for (let week = 0; week < WEEKS_OF_HISTORY; week++) {
    const isDeload = week === DELOAD_WEEK_INDEX;
    // Fatigue qui monte dans le mésocycle, retombe au deload, remonte ensuite.
    const cycleWeek = week <= DELOAD_WEEK_INDEX ? week : week - DELOAD_WEEK_INDEX - 1;
    const baseFatigue = isDeload ? 2 : Math.min(7.5, 2.5 + cycleWeek * 1.1);

    for (const day of DAYS) {
      if (SKIPPED.has(`${week}-${day.title}`)) continue;

      const date = new Date(
        blockStartMonday.getTime() + (week * 7 + day.weekdayOffset) * DAY_MS
      )
        .toISOString()
        .slice(0, 10);
      if (date > today) continue;

      const sessionId = devUuid();
      const fatigue = Math.round(
        Math.min(9, Math.max(1, baseFatigue + noise(0.8))) * 10
      ) / 10;
      const startedAt = `${date}T17:30:00.000Z`;
      const endedAt = `${date}T18:35:00.000Z`;

      await db.runAsync(
        `INSERT INTO sessions (
          id, user_id, workout_day_id, block_id, date, started_at, ended_at,
          status, completion_score, performance_score, fatigue_score,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?)`,
        [
          sessionId,
          userId,
          workoutDayIds.get(day.title)!,
          blockId,
          date,
          startedAt,
          endedAt,
          1,
          Math.round((0.75 + noise(0.1)) * 100) / 100,
          fatigue,
          startedAt,
          endedAt,
        ]
      );
      sessionCount++;

      for (const ex of day.exercises) {
        const loadMultiplier = isDeload ? 0.9 : 1;
        const load =
          ex.baseLoad === null
            ? null
            : Math.round(
                (ex.baseLoad + week * ex.weeklyIncrement) * loadMultiplier * 4
              ) / 4;

        for (let setNo = 1; setNo <= ex.sets; setNo++) {
          const reps =
            ex.repsMin +
            Math.floor(Math.random() * (ex.repsMax - ex.repsMin + 1));
          const rir = isDeload ? 3 : Math.max(0, 2 - Math.floor(setNo / 3) + Math.round(noise(1)));

          await db.runAsync(
            `INSERT INTO set_logs (
              id, session_id, exercise_id, set_number,
              target_load, target_reps, target_rir,
              load, reps, rir, completed, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            [
              devUuid(),
              sessionId,
              ex.exerciseId,
              setNo,
              load,
              ex.repsMax,
              2,
              load,
              reps,
              Math.min(4, Math.max(0, rir)),
              startedAt,
              startedAt,
            ]
          );
          setCount++;
        }
      }
    }
  }

  // Poids du corps : une pesée tous les 2 jours sur 90 jours, 84 → ~81.5 kg.
  let weighIns = 0;
  for (let daysAgo = 90; daysAgo >= 0; daysAgo -= 2) {
    const date = isoDaysAgo(daysAgo);
    const weight =
      Math.round((84 - (90 - daysAgo) * 0.028 + noise(0.35)) * 10) / 10;
    await db.runAsync(
      `INSERT OR REPLACE INTO body_metrics (id, user_id, date, weight_kg, notes, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)`,
      [devUuid(), userId, date, weight, `${date}T07:30:00.000Z`]
    );
    weighIns++;
  }

  // Check-ins de récupération : 10 derniers jours (sauf aujourd'hui, pour
  // pouvoir tester la carte de saisie soi-même).
  let checkins = 0;
  for (let daysAgo = 10; daysAgo >= 1; daysAgo--) {
    const date = isoDaysAgo(daysAgo);
    await db.runAsync(
      `INSERT OR REPLACE INTO recovery_logs (
        id, user_id, date, sleep_quality, energy, soreness, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
      [
        devUuid(),
        userId,
        date,
        5 + Math.floor(Math.random() * 4),
        4 + Math.floor(Math.random() * 5),
        2 + Math.floor(Math.random() * 5),
        `${date}T08:00:00.000Z`,
      ]
    );
    checkins++;
  }

  return { sessions: sessionCount, sets: setCount, weighIns, checkins };
}
