/**
 * Mock SQLite in-memory pour les tests d'intégration du rules engine.
 *
 * Mutualisé entre `rules-engine-service.test.ts` (TA-109) et
 * `__tests__/rules-engine-integration.test.ts` (TA-114).
 *
 * Le mock interprète un sous-ensemble réduit de SQL utilisé par les services
 * `sessions`, `set_logs`, `planned_exercises`, `recommendations`, `blocks` et
 * `sync_queue` — fidèle à la sémantique de `expo-sqlite` (tri, filtres, limit).
 *
 * Pas de `*.test.*` ni placement dans `__tests__/` → Jest ne traitera pas ce
 * fichier comme une suite de tests.
 *
 * WHY : 2 callers réels → extraction justifiée (règle "≥2 callers réels"
 * et seuil R6 — chaque fichier de tests reste sous 400 lignes).
 */

import type { SQLiteDatabase } from 'expo-sqlite';

type Row = Record<string, unknown>;

export type InMemoryStore = {
  app_meta: Row[];
  sessions: Row[];
  set_logs: Row[];
  planned_exercises: Row[];
  recommendations: Row[];
  blocks: Row[];
  sync_queue: Row[];
};

/**
 * Patche `globalThis.crypto` pour exposer `randomUUID` et `getRandomValues`.
 * À appeler dans un `beforeAll` au niveau du fichier de test.
 *
 * WHY : Hermes n'expose pas `crypto.randomUUID` (cf. pitfall RN-01),
 * et les factories de seeds génèrent des UUIDs via `@/utils/uuid`.
 */
export function installCryptoMock(): void {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      randomUUID: () => 'mock-uuid',
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = (i * 7) & 0xff;
        return arr;
      },
    },
    writable: true,
    configurable: true,
  });
}

export function makeInMemoryDb(): SQLiteDatabase & { __store: InMemoryStore } {
  const store: InMemoryStore = {
    app_meta: [],
    sessions: [],
    set_logs: [],
    planned_exercises: [],
    recommendations: [],
    blocks: [],
    sync_queue: [],
  };

  const runAsync = jest.fn(async (sql: string, params: unknown[] = []) => {
    const trimmed = sql.trim();

    if (trimmed.startsWith('INSERT OR IGNORE INTO app_meta')) {
      if (!store.app_meta.find((r) => r.key === params[0])) {
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
        is_unplanned: params[14],
        created_at: params[15],
      });
    } else if (trimmed.startsWith('INSERT INTO recommendations')) {
      store.recommendations.push({
        id: params[0],
        session_id: params[1],
        exercise_id: params[2],
        source: params[3],
        type: params[4],
        message: params[5],
        next_load: params[6],
        next_rep_target: params[7],
        next_rir_target: params[8],
        action: params[9],
        confidence: params[10],
        metadata: params[11],
        created_at: params[12],
      });
    } else if (trimmed.startsWith('DELETE FROM recommendations')) {
      const id = params[0] as string;
      store.recommendations = store.recommendations.filter((r) => r.id !== id);
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
    } else if (trimmed.startsWith('UPDATE blocks')) {
      const id = params[params.length - 1] as string;
      const idx = store.blocks.findIndex((r) => r.id === id);
      if (idx >= 0) {
        store.blocks[idx] = {
          ...store.blocks[idx],
          title: params[0],
          goal: params[1],
          duration_weeks: params[2],
          week_number: params[3],
          start_date: params[4],
          end_date: params[5],
          status: params[6],
          deload_strategy: params[7],
          updated_at: params[8],
        };
      }
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
        const row = store.app_meta.find((r) => r.key === params[0]);
        return ((row ? { value: row.value } : null) as T | null);
      }
      if (trimmed.includes('FROM sessions WHERE id')) {
        return ((store.sessions.find((r) => r.id === params[0]) as T) ?? null);
      }
      if (trimmed.includes('FROM set_logs WHERE id')) {
        return ((store.set_logs.find((r) => r.id === params[0]) as T) ?? null);
      }
      if (trimmed.includes('FROM blocks WHERE id')) {
        return ((store.blocks.find((r) => r.id === params[0]) as T) ?? null);
      }
      if (trimmed.includes('FROM planned_exercises WHERE id')) {
        return ((store.planned_exercises.find((r) => r.id === params[0]) as T) ?? null);
      }
      if (trimmed.includes('FROM recommendations WHERE id')) {
        return ((store.recommendations.find((r) => r.id === params[0]) as T) ?? null);
      }
      return null;
    },
  );

  const getAllAsync = jest.fn(
    async <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
      const trimmed = sql.trim();

      if (trimmed.startsWith('SELECT id FROM set_logs WHERE session_id')) {
        return store.set_logs
          .filter((r) => r.session_id === params[0])
          .map((r) => ({ id: r.id })) as T[];
      }
      if (trimmed.includes('FROM set_logs') && trimmed.includes('session_id = ?')) {
        return store.set_logs
          .filter((r) => r.session_id === params[0])
          .sort((a, b) => (a.set_number as number) - (b.set_number as number)) as T[];
      }
      if (trimmed.includes('FROM sessions WHERE user_id')) {
        const userId = params[0] as string;
        const limit = trimmed.includes('LIMIT ?') ? (params[1] as number) : Infinity;
        return store.sessions
          .filter((r) => r.user_id === userId)
          .sort((a, b) =>
            (b.date as string).localeCompare(a.date as string) ||
            (b.created_at as string).localeCompare(a.created_at as string),
          )
          .slice(0, limit) as T[];
      }
      if (trimmed.includes('FROM planned_exercises') && trimmed.includes('workout_day_id = ?')) {
        return store.planned_exercises
          .filter((r) => r.workout_day_id === params[0])
          .sort((a, b) => (a.exercise_order as number) - (b.exercise_order as number)) as T[];
      }
      if (trimmed.includes('FROM recommendations') && trimmed.includes('session_id = ?')) {
        return store.recommendations
          .filter((r) => r.session_id === params[0])
          .sort((a, b) => (a.created_at as string).localeCompare(b.created_at as string)) as T[];
      }
      return [];
    },
  );

  return {
    runAsync,
    getFirstAsync,
    getAllAsync,
    execAsync: jest.fn(async () => {}),
    __store: store,
  } as unknown as SQLiteDatabase & { __store: InMemoryStore };
}
