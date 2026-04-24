/**
 * TA-19 — Test d'intégration Phase 3.
 *
 * Valide le flow complet : insert Program → Block → WorkoutDay → PlannedExercise,
 * avec écriture SQLite + enregistrement SyncQueue par table, puis relecture.
 *
 * On mocke un SQLiteDatabase en mémoire qui maintient un état partagé
 * (pas de vrai SQLite en CI pour jest-expo), mais vérifie :
 *   - les INSERT SQL des 4 tables
 *   - la génération de 4 lignes sync_queue (une par table), dans l'ordre
 *   - les payloads Supabase (snake_case, types corrects)
 */

import { insertProgram, getProgramById } from './programs';
import { insertBlock, getBlockById } from './blocks';
import { insertWorkoutDay, getWorkoutDayById } from './workout-days';
import {
  insertPlannedExercise,
  getPlannedExercisesByWorkoutDayId,
} from './planned-exercises';
import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Stockage en mémoire minimal pour simuler SQLite sur les 4 tables + sync_queue.
 * On intercepte les INSERT et les SELECT by-id/by-FK utilisés par les repos.
 */
type Row = Record<string, unknown>;
type Store = {
  programs: Row[];
  blocks: Row[];
  workout_days: Row[];
  planned_exercises: Row[];
  sync_queue: Row[];
};

function makeInMemoryDb(): SQLiteDatabase & { __store: Store } {
  const store: Store = {
    programs: [],
    blocks: [],
    workout_days: [],
    planned_exercises: [],
    sync_queue: [],
  };

  // Parseur simpliste : identifie la table cible et l'action depuis le SQL.
  // Suffisant pour ce test ; le vrai SQL est exécuté par SQLite en prod.
  const runAsync = jest.fn(async (sql: string, params: unknown[] = []) => {
    const trimmed = sql.trim();

    if (trimmed.startsWith('INSERT INTO programs')) {
      store.programs.push({
        id: params[0],
        user_id: params[1],
        title: params[2],
        goal: params[3],
        frequency: params[4],
        level: params[5],
        is_active: params[6],
        created_at: params[7],
        updated_at: params[8],
      });
    } else if (trimmed.startsWith('INSERT INTO blocks')) {
      store.blocks.push({
        id: params[0],
        program_id: params[1],
        title: params[2],
        goal: params[3],
        duration_weeks: params[4],
        week_number: params[5],
        start_date: params[6],
        end_date: params[7],
        status: params[8],
        deload_strategy: params[9],
        created_at: params[10],
        updated_at: params[11],
      });
    } else if (trimmed.startsWith('INSERT INTO workout_days')) {
      store.workout_days.push({
        id: params[0],
        block_id: params[1],
        title: params[2],
        day_order: params[3],
        split_type: params[4],
        estimated_duration_min: params[5],
        created_at: params[6],
      });
    } else if (trimmed.startsWith('INSERT INTO planned_exercises')) {
      store.planned_exercises.push({
        id: params[0],
        workout_day_id: params[1],
        exercise_id: params[2],
        exercise_order: params[3],
        role: params[4],
        sets: params[5],
        rep_range_min: params[6],
        rep_range_max: params[7],
        target_rir: params[8],
        rest_seconds: params[9],
        tempo: params[10],
        progression_type: params[11],
        progression_config: params[12],
        notes: params[13],
        created_at: params[14],
      });
    } else if (trimmed.startsWith('INSERT INTO sync_queue')) {
      store.sync_queue.push({
        id: store.sync_queue.length + 1,
        table_name: params[0],
        record_id: params[1],
        action: params[2],
        payload: params[3],
        created_at: params[4],
        synced: 0,
      });
    }
    return { lastInsertRowId: 1, changes: 1 };
  });

  const getFirstAsync = jest.fn(async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
    const trimmed = sql.trim();
    const id = params[0] as string;
    if (trimmed.includes('FROM programs WHERE id')) {
      return (store.programs.find((r) => r.id === id) as T) ?? null;
    }
    if (trimmed.includes('FROM blocks WHERE id')) {
      return (store.blocks.find((r) => r.id === id) as T) ?? null;
    }
    if (trimmed.includes('FROM workout_days WHERE id')) {
      return (store.workout_days.find((r) => r.id === id) as T) ?? null;
    }
    if (trimmed.includes('FROM planned_exercises WHERE id')) {
      return (store.planned_exercises.find((r) => r.id === id) as T) ?? null;
    }
    return null;
  });

  const getAllAsync = jest.fn(
    async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
      const trimmed = sql.trim();
      if (trimmed.includes('FROM planned_exercises WHERE workout_day_id')) {
        const wdId = params[0];
        return store.planned_exercises
          .filter((r) => r.workout_day_id === wdId)
          .sort(
            (a, b) =>
              (a.exercise_order as number) - (b.exercise_order as number)
          ) as T[];
      }
      return [];
    }
  );

  return {
    runAsync,
    getFirstAsync,
    getAllAsync,
    execAsync: jest.fn(async () => {}),
    __store: store,
  } as unknown as SQLiteDatabase & { __store: Store };
}

describe('TA-19 — Phase 3 integration : Program → Block → WorkoutDay → PlannedExercise', () => {
  it('inserts the full hierarchy and enqueues one sync record per entity', async () => {
    const db = makeInMemoryDb();

    const program = await insertProgram(db, {
      id: 'prog-1',
      userId: 'user-1',
      title: 'PPL 6 jours',
      goal: 'hypertrophy',
      frequency: 6,
      level: 'intermediate',
      isActive: true,
    });

    const block = await insertBlock(db, {
      id: 'block-1',
      programId: program.id,
      title: 'Accumulation',
      goal: 'hypertrophy',
      durationWeeks: 6,
      deloadStrategy: 'fatigue_triggered',
    });

    const day = await insertWorkoutDay(db, {
      id: 'wd-1',
      blockId: block.id,
      title: 'Push A',
      dayOrder: 0,
      splitType: 'push',
      estimatedDurationMin: 75,
    });

    const pe = await insertPlannedExercise(db, {
      id: 'pe-1',
      workoutDayId: day.id,
      exerciseId: 'ex-bench',
      exerciseOrder: 0,
      role: 'main',
      sets: 4,
      repRangeMin: 6,
      repRangeMax: 8,
      targetRir: 2,
      restSeconds: 180,
      tempo: '3-1-1-0',
      progressionType: 'double_progression',
      progressionConfig: {
        increment_kg: 2.5,
        min_reps: 6,
        max_reps: 8,
        all_sets_at_max_to_increase: true,
        regressions_before_alert: 2,
      },
    });

    // Relecture cohérente
    const reloadedProgram = await getProgramById(db, program.id);
    expect(reloadedProgram?.isActive).toBe(true);

    const reloadedBlock = await getBlockById(db, block.id);
    expect(reloadedBlock?.programId).toBe(program.id);
    expect(reloadedBlock?.deloadStrategy).toBe('fatigue_triggered');

    const reloadedDay = await getWorkoutDayById(db, day.id);
    expect(reloadedDay?.blockId).toBe(block.id);

    const reloadedPEs = await getPlannedExercisesByWorkoutDayId(db, day.id);
    expect(reloadedPEs).toHaveLength(1);
    expect(reloadedPEs[0].workoutDayId).toBe(day.id);
    expect(reloadedPEs[0].progressionConfig).toMatchObject({
      increment_kg: 2.5,
    });

    // SyncQueue : 4 records dans l'ordre d'insertion
    expect(db.__store.sync_queue).toHaveLength(4);
    const [p, b, w, pex] = db.__store.sync_queue;
    expect(p.table_name).toBe('programs');
    expect(p.record_id).toBe('prog-1');
    expect(p.action).toBe('insert');
    expect(JSON.parse(p.payload as string).is_active).toBe(true);

    expect(b.table_name).toBe('blocks');
    expect(b.record_id).toBe('block-1');
    expect(JSON.parse(b.payload as string).program_id).toBe('prog-1');

    expect(w.table_name).toBe('workout_days');
    expect(w.record_id).toBe('wd-1');
    expect(JSON.parse(w.payload as string).block_id).toBe('block-1');

    expect(pex.table_name).toBe('planned_exercises');
    expect(pex.record_id).toBe('pe-1');
    const pexPayload = JSON.parse(pex.payload as string);
    expect(pexPayload.workout_day_id).toBe('wd-1');
    // progression_config est un objet (jsonb-ready), pas une string
    expect(typeof pexPayload.progression_config).toBe('object');
    expect(pexPayload.progression_config.increment_kg).toBe(2.5);

    // Invariant : aucun payload ne doit contenir de 0/1 pour un boolean
    // (is_active, etc.) — la sérialisation SQLite ≠ Supabase.
    const programPayload = JSON.parse(p.payload as string);
    expect(programPayload.is_active).not.toBe(1);
    expect(programPayload.is_active).not.toBe(0);
    expect(typeof programPayload.is_active).toBe('boolean');

    // Persistence locale SQLite : is_active est bien 1 (entier)
    expect(db.__store.programs[0].is_active).toBe(1);

    // PE SQLite : progression_config stringifié
    expect(typeof db.__store.planned_exercises[0].progression_config).toBe(
      'string'
    );

    // Fatigue-less expectation : aucune dépendance IA/réseau dans ce flow
    // (cf ADR-004 : fallback obligatoire, ADR-002 : offline-first)
  });
});
