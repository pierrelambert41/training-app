/**
 * TA-72 — Test d'intégration Phase 4.
 *
 * Valide le flow complet du logger offline-first :
 *   - getOrCreateDeviceId puis insertSession
 *   - insertSetLog × N (avec planned_exercise_id, side='left'/'right'/null)
 *   - updateSetLog (correction post-séance)
 *   - updateSession → status=completed
 *   - relecture cohérente
 *   - SyncQueue : 1 entrée par mutation, payloads snake_case Supabase.
 *
 * Le ticket ne touche pas au sync engine (Phase 6) — on valide seulement
 * que la queue contient ce qu'il faudra rejouer.
 */

import {
  insertSession,
  updateSession,
  getSessionById,
  deleteSession,
} from './sessions';
import {
  insertSetLog,
  updateSetLog,
  getSetLogsBySessionId,
} from './set-logs';
import type { SQLiteDatabase } from 'expo-sqlite';

type Row = Record<string, unknown>;
type Store = {
  app_meta: Row[];
  sessions: Row[];
  set_logs: Row[];
  sync_queue: Row[];
};

function makeInMemoryDb(): SQLiteDatabase & { __store: Store } {
  const store: Store = {
    app_meta: [],
    sessions: [],
    set_logs: [],
    sync_queue: [],
  };

  const runAsync = jest.fn(async (sql: string, params: unknown[] = []) => {
    const trimmed = sql.trim();

    if (trimmed.startsWith('INSERT OR IGNORE INTO app_meta')) {
      const exists = store.app_meta.find((r) => r.key === params[0]);
      if (!exists) {
        store.app_meta.push({ key: params[0], value: params[1] });
      }
    } else if (trimmed.startsWith('INSERT INTO sessions')) {
      store.sessions.push({
        id: params[0],
        user_id: params[1],
        workout_day_id: params[2],
        block_id: params[3],
        date: params[4],
        started_at: params[5],
        ended_at: params[6],
        status: params[7],
        readiness: params[8],
        energy: params[9],
        motivation: params[10],
        sleep_quality: params[11],
        pre_session_notes: params[12],
        completion_score: params[13],
        performance_score: params[14],
        fatigue_score: params[15],
        post_session_notes: params[16],
        device_id: params[17],
        synced_at: params[18],
        created_at: params[19],
        updated_at: params[20],
      });
    } else if (trimmed.startsWith('UPDATE sessions')) {
      const id = params[params.length - 1] as string;
      const idx = store.sessions.findIndex((r) => r.id === id);
      if (idx >= 0) {
        store.sessions[idx] = {
          ...store.sessions[idx],
          workout_day_id: params[0],
          block_id: params[1],
          date: params[2],
          started_at: params[3],
          ended_at: params[4],
          status: params[5],
          readiness: params[6],
          energy: params[7],
          motivation: params[8],
          sleep_quality: params[9],
          pre_session_notes: params[10],
          completion_score: params[11],
          performance_score: params[12],
          fatigue_score: params[13],
          post_session_notes: params[14],
          updated_at: params[15],
        };
      }
    } else if (trimmed.startsWith('DELETE FROM sessions')) {
      const id = params[0] as string;
      store.sessions = store.sessions.filter((r) => r.id !== id);
    } else if (trimmed.startsWith('INSERT INTO set_logs')) {
      store.set_logs.push({
        id: params[0],
        session_id: params[1],
        exercise_id: params[2],
        planned_exercise_id: params[3],
        set_number: params[4],
        target_load: params[5],
        target_reps: params[6],
        target_rir: params[7],
        load: params[8],
        reps: params[9],
        rir: params[10],
        duration_seconds: params[11],
        distance_meters: params[12],
        completed: params[13],
        side: params[14],
        notes: params[15],
        created_at: params[16],
        updated_at: params[17],
      });
    } else if (trimmed.startsWith('UPDATE set_logs')) {
      const id = params[params.length - 1] as string;
      const idx = store.set_logs.findIndex((r) => r.id === id);
      if (idx >= 0) {
        store.set_logs[idx] = {
          ...store.set_logs[idx],
          set_number: params[0],
          target_load: params[1],
          target_reps: params[2],
          target_rir: params[3],
          load: params[4],
          reps: params[5],
          rir: params[6],
          duration_seconds: params[7],
          distance_meters: params[8],
          completed: params[9],
          side: params[10],
          notes: params[11],
          updated_at: params[12],
        };
      }
    } else if (trimmed.startsWith('DELETE FROM set_logs')) {
      const id = params[0] as string;
      store.set_logs = store.set_logs.filter((r) => r.id !== id);
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

  const getFirstAsync = jest.fn(
    async <T>(sql: string, params: unknown[] = []): Promise<T | null> => {
      const trimmed = sql.trim();

      if (trimmed.includes('FROM app_meta')) {
        const key = params[0] as string;
        const row = store.app_meta.find((r) => r.key === key);
        return ((row ? { value: row.value } : null) as T | null);
      }
      if (trimmed.includes('FROM sessions WHERE id')) {
        const id = params[0] as string;
        return ((store.sessions.find((r) => r.id === id) as T) ?? null);
      }
      if (trimmed.includes('FROM set_logs WHERE id')) {
        const id = params[0] as string;
        return ((store.set_logs.find((r) => r.id === id) as T) ?? null);
      }
      return null;
    }
  );

  const getAllAsync = jest.fn(
    async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
      const trimmed = sql.trim();

      if (trimmed.startsWith('SELECT id FROM set_logs WHERE session_id')) {
        const sessionId = params[0] as string;
        return store.set_logs
          .filter((r) => r.session_id === sessionId)
          .map((r) => ({ id: r.id })) as T[];
      }
      if (
        trimmed.includes('FROM set_logs') &&
        trimmed.includes('session_id = ?') &&
        trimmed.includes('exercise_id = ?')
      ) {
        const sessionId = params[0] as string;
        const exerciseId = params[1] as string;
        return store.set_logs
          .filter(
            (r) => r.session_id === sessionId && r.exercise_id === exerciseId
          )
          .sort(
            (a, b) => (a.set_number as number) - (b.set_number as number)
          ) as T[];
      }
      if (trimmed.includes('FROM set_logs') && trimmed.includes('session_id = ?')) {
        const sessionId = params[0] as string;
        return store.set_logs
          .filter((r) => r.session_id === sessionId)
          .sort((a, b) => {
            const exerciseDiff = (a.exercise_id as string).localeCompare(
              b.exercise_id as string
            );
            if (exerciseDiff !== 0) return exerciseDiff;
            return (a.set_number as number) - (b.set_number as number);
          }) as T[];
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

describe('TA-72 — Phase 4 integration : Session + SetLog full flow', () => {
  it('logs a complete session offline and produces a coherent SyncQueue', async () => {
    const db = makeInMemoryDb();

    // 1. Création de la session — device_id auto-résolu via app_meta.
    const session = await insertSession(db, {
      id: 'sess-1',
      userId: 'user-1',
      workoutDayId: 'wd-1',
      blockId: 'block-1',
      date: '2026-04-25',
      startedAt: '2026-04-25T10:00:00.000Z',
      readiness: 8,
      energy: 7,
      motivation: 9,
      sleepQuality: 7,
    });

    expect(session.status).toBe('in_progress');
    expect(session.deviceId).toMatch(/^[0-9a-f-]{36}$/i);
    // Le device_id est persisté dans app_meta.
    expect(db.__store.app_meta).toHaveLength(1);
    expect(db.__store.app_meta[0].value).toBe(session.deviceId);

    // 2. Trois sets sur un exercice bilatéral (bench).
    await insertSetLog(db, {
      id: 'sl-1',
      sessionId: session.id,
      exerciseId: 'ex-bench',
      plannedExerciseId: 'pe-bench',
      setNumber: 1,
      targetLoad: 100,
      targetReps: 8,
      targetRir: 2,
      load: 100,
      reps: 8,
      rir: 2,
    });
    await insertSetLog(db, {
      id: 'sl-2',
      sessionId: session.id,
      exerciseId: 'ex-bench',
      plannedExerciseId: 'pe-bench',
      setNumber: 2,
      targetLoad: 100,
      targetReps: 8,
      targetRir: 2,
      load: 100,
      reps: 7,
      rir: 1,
    });
    await insertSetLog(db, {
      id: 'sl-3',
      sessionId: session.id,
      exerciseId: 'ex-bench',
      plannedExerciseId: 'pe-bench',
      setNumber: 3,
      targetLoad: 100,
      targetReps: 8,
      targetRir: 2,
      load: 100,
      reps: 6,
      rir: 0,
      completed: false,
      notes: 'forme dégradée',
    });

    // 3. Deux sets unilatéraux (curl haltère).
    await insertSetLog(db, {
      id: 'sl-4-l',
      sessionId: session.id,
      exerciseId: 'ex-curl',
      plannedExerciseId: 'pe-curl',
      setNumber: 1,
      load: 12,
      reps: 12,
      rir: 1,
      side: 'left',
    });
    await insertSetLog(db, {
      id: 'sl-4-r',
      sessionId: session.id,
      exerciseId: 'ex-curl',
      plannedExerciseId: 'pe-curl',
      setNumber: 1,
      load: 12,
      reps: 12,
      rir: 1,
      side: 'right',
    });

    // 4. Correction post-séance d'une rep (l'utilisateur s'est trompé).
    const corrected = await updateSetLog(db, 'sl-2', { reps: 8 });
    expect(corrected?.reps).toBe(8);
    expect(corrected?.updatedAt).not.toBe(corrected?.createdAt);

    // 5. Fin de séance.
    const completed = await updateSession(db, session.id, {
      status: 'completed',
      endedAt: '2026-04-25T11:30:00.000Z',
      postSessionNotes: 'good session',
    });
    expect(completed?.status).toBe('completed');
    expect(completed?.endedAt).toBe('2026-04-25T11:30:00.000Z');

    // 6. Relecture cohérente.
    const reloaded = await getSessionById(db, session.id);
    expect(reloaded?.status).toBe('completed');
    expect(reloaded?.deviceId).toBe(session.deviceId);
    expect(reloaded?.syncedAt).toBeNull();

    const allSets = await getSetLogsBySessionId(db, session.id);
    expect(allSets).toHaveLength(5);
    // Tri déterministe : exercise_id ASC puis set_number ASC.
    expect(allSets.map((s) => s.exerciseId)).toEqual([
      'ex-bench',
      'ex-bench',
      'ex-bench',
      'ex-curl',
      'ex-curl',
    ]);
    // Le set 2 corrigé doit refléter la nouvelle valeur.
    const set2 = allSets.find((s) => s.id === 'sl-2');
    expect(set2?.reps).toBe(8);

    // ============================================================
    // Vérification SyncQueue : 1 entrée par mutation, payload Supabase.
    // ============================================================
    // 1 insert session + 5 insert set_logs + 1 update set_log + 1 update session
    // = 8 entrées.
    expect(db.__store.sync_queue).toHaveLength(8);

    const tables = db.__store.sync_queue.map((r) => r.table_name);
    const actions = db.__store.sync_queue.map((r) => r.action);
    expect(tables).toEqual([
      'sessions',
      'set_logs',
      'set_logs',
      'set_logs',
      'set_logs',
      'set_logs',
      'set_logs',
      'sessions',
    ]);
    expect(actions).toEqual([
      'insert',
      'insert',
      'insert',
      'insert',
      'insert',
      'insert',
      'update',
      'update',
    ]);

    // Payload de l'insert session : snake_case, pas de synced_at.
    const sessionInsertPayload = JSON.parse(
      db.__store.sync_queue[0].payload as string
    );
    expect(sessionInsertPayload).toMatchObject({
      id: 'sess-1',
      user_id: 'user-1',
      workout_day_id: 'wd-1',
      block_id: 'block-1',
      status: 'in_progress',
      readiness: 8,
      device_id: session.deviceId,
    });
    expect(sessionInsertPayload).not.toHaveProperty('synced_at');

    // Payload d'un set unilatéral : side='left'.
    const leftSetPayload = JSON.parse(
      (db.__store.sync_queue.find(
        (r) => r.record_id === 'sl-4-l'
      )!.payload) as string
    );
    expect(leftSetPayload.side).toBe('left');
    expect(leftSetPayload.completed).toBe(true);
    // Boolean natif (pas 1).
    expect(typeof leftSetPayload.completed).toBe('boolean');

    // Payload du set incomplet : completed=false (boolean natif).
    const failedSetPayload = JSON.parse(
      (db.__store.sync_queue.find(
        (r) => r.record_id === 'sl-3'
      )!.payload) as string
    );
    expect(failedSetPayload.completed).toBe(false);
    expect(failedSetPayload.notes).toBe('forme dégradée');

    // Payload de l'update session : status=completed, scores nuls.
    const sessionUpdatePayload = JSON.parse(
      (db.__store.sync_queue[7].payload) as string
    );
    expect(sessionUpdatePayload.status).toBe('completed');
    expect(sessionUpdatePayload.ended_at).toBe('2026-04-25T11:30:00.000Z');
    expect(sessionUpdatePayload.completion_score).toBeNull();

    // ============================================================
    // Persistance locale : completed est 0/1 (entier) côté SQLite.
    // ============================================================
    const set3Local = db.__store.set_logs.find((r) => r.id === 'sl-3');
    expect(set3Local?.completed).toBe(0);
    const set1Local = db.__store.set_logs.find((r) => r.id === 'sl-1');
    expect(set1Local?.completed).toBe(1);
  });

  it('deleteSession cascades to set_logs in SyncQueue', async () => {
    const db = makeInMemoryDb();

    await insertSession(db, {
      id: 'sess-x',
      userId: 'user-1',
      date: '2026-04-25',
      deviceId: 'd1',
    });
    await insertSetLog(db, {
      id: 'sl-x1',
      sessionId: 'sess-x',
      exerciseId: 'ex1',
      setNumber: 1,
    });
    await insertSetLog(db, {
      id: 'sl-x2',
      sessionId: 'sess-x',
      exerciseId: 'ex1',
      setNumber: 2,
    });

    await deleteSession(db, 'sess-x');

    expect(db.__store.sessions).toHaveLength(0);
    expect(db.__store.set_logs).toHaveLength(0);

    const deletes = db.__store.sync_queue.filter((r) => r.action === 'delete');
    expect(deletes.map((r) => r.table_name)).toEqual([
      'set_logs',
      'set_logs',
      'sessions',
    ]);
    // Idempotence : payload minimal { id } pour delete (cf. ADR-012).
    for (const d of deletes) {
      const p = JSON.parse(d.payload as string);
      expect(Object.keys(p)).toEqual(['id']);
    }
  });
});
