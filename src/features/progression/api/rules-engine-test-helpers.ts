/**
 * Factories de seeds pour les tests d'intégration du rules engine.
 *
 * Mutualisé entre `rules-engine-service.test.ts` (TA-109) et
 * `__tests__/rules-engine-integration.test.ts` (TA-114).
 *
 * L'infra SQLite in-memory est dans `./rules-engine-in-memory-db.ts`.
 *
 * Pas de `*.test.*` dans le nom → Jest ne traitera pas ce fichier comme une
 * suite de tests.
 */

import type { SQLiteDatabase } from 'expo-sqlite';

import { insertBlock } from '@/services/blocks';
import { insertPlannedExercise } from '@/services/planned-exercises';
import { insertSession } from '@/services/sessions';
import { insertSetLog } from '@/services/set-logs';
import type {
  PlannedExercise,
  Session,
  SetLog,
  StrengthFixedConfig,
} from '@/types';

// Re-export du mock SQLite pour que les fichiers de test puissent importer
// l'ensemble depuis un seul module.
export {
  installCryptoMock,
  makeInMemoryDb,
  type InMemoryStore,
} from './rules-engine-in-memory-db';

/**
 * Config strength_fixed par défaut pour les tests : increment 2.5 kg upper,
 * 5 kg lower, RIR>=2 pour augmenter, reset 5 kg après 2 échecs.
 */
export const STRENGTH_CFG: StrengthFixedConfig = {
  increment_upper_kg: 2.5,
  increment_lower_kg: 5,
  rir_threshold_increase: 2,
  failures_before_reset: 2,
  reset_delta_kg: 5,
};

export async function seedBlock(
  db: SQLiteDatabase,
  overrides: Partial<Parameters<typeof insertBlock>[1]> = {},
) {
  return insertBlock(db, {
    id: 'block-1',
    programId: 'prog-1',
    title: 'Bloc 1',
    goal: 'hypertrophy',
    durationWeeks: 6,
    weekNumber: 2,
    status: 'active',
    deloadStrategy: 'fatigue_triggered',
    ...overrides,
  });
}

export async function seedSession(
  db: SQLiteDatabase,
  overrides: Partial<Parameters<typeof insertSession>[1]> = {},
): Promise<Session> {
  return insertSession(db, {
    id: 'sess-1',
    userId: 'user-1',
    workoutDayId: 'wd-1',
    blockId: 'block-1',
    date: '2026-04-29',
    startedAt: '2026-04-29T10:00:00.000Z',
    readiness: 8,
    energy: 7,
    motivation: 8,
    sleepQuality: 7,
    ...overrides,
  });
}

export async function seedPlannedExercise(
  db: SQLiteDatabase,
  overrides: Partial<Parameters<typeof insertPlannedExercise>[1]> = {},
): Promise<PlannedExercise> {
  return insertPlannedExercise(db, {
    id: 'pe-bench',
    workoutDayId: 'wd-1',
    exerciseId: 'ex-bench',
    exerciseOrder: 1,
    role: 'main',
    sets: 3,
    repRangeMin: 6,
    repRangeMax: 8,
    targetRir: 2,
    restSeconds: 180,
    tempo: null,
    progressionType: 'strength_fixed',
    progressionConfig: STRENGTH_CFG,
    ...overrides,
  });
}

/**
 * Logue `count` séries identiques pour un exercice.
 *
 * Par défaut : 'ex-bench' / 'pe-bench'. `baseSetLogId` permet de différencier
 * plusieurs appels dans la même session (sinon collision d'IDs).
 */
export async function logBenchSets(
  db: SQLiteDatabase,
  sessionId: string,
  load: number,
  reps: number,
  rir: number,
  count: number = 3,
  exerciseId: string = 'ex-bench',
  plannedExerciseId: string | null = 'pe-bench',
  baseSetLogId: string = 'sl',
): Promise<SetLog[]> {
  const logs: SetLog[] = [];
  for (let i = 1; i <= count; i++) {
    const sl = await insertSetLog(db, {
      id: `${baseSetLogId}-${sessionId}-${i}`,
      sessionId,
      exerciseId,
      plannedExerciseId: plannedExerciseId ?? undefined,
      setNumber: i,
      targetLoad: load,
      targetReps: reps,
      targetRir: rir,
      load,
      reps,
      rir,
      completed: true,
    });
    logs.push(sl);
  }
  return logs;
}
