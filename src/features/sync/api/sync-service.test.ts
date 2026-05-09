import { createSyncService } from './sync-service';
import {
  type MockDbState,
  makeMockDb,
  makeQueueRow,
  makeStubBuilder,
  makeSupabaseStub,
} from './sync-service-test-helpers';

// Suite "push de base" : couvre le moteur push() (succès / échec / robustesse
// / ordre causal / snapshot / delete / payload corrompu) + getUnsynced().
//
// La suite TA-122 (résolution de conflits last-write-wins) vit dans
// `sync-service-conflict.test.ts` — split thématique pour respecter R6
// (signal d'alerte > 250 lignes, refacto obligatoire > 400 lignes).

describe('createSyncService — push()', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // AC : queue vide → no-op (pas d'appel réseau)
  it('returns no-op when queue is empty', async () => {
    const state: MockDbState = { queueRows: [], runCalls: [] };
    const db = makeMockDb(state);
    const { client, from } = makeSupabaseStub({});

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result).toEqual({ pushed: 0, failed: 0, results: [], conflicts: [] });
    expect(from).not.toHaveBeenCalled();
    expect(state.runCalls).toEqual([]);
  });

  // AC : push complet — 6 entrées sur 6 tables différentes (spec PO), 6 upserts, 6 marks synced
  it('pushes all entries to Supabase and marks them synced (6/6)', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({ id: 1, table_name: 'sessions', record_id: 's1' }),
        makeQueueRow({ id: 2, table_name: 'set_logs', record_id: 'sl1' }),
        makeQueueRow({ id: 3, table_name: 'recommendations', record_id: 'r1' }),
        makeQueueRow({ id: 4, table_name: 'blocks', record_id: 'b1' }),
        makeQueueRow({ id: 5, table_name: 'workout_days', record_id: 'wd1' }),
        makeQueueRow({ id: 6, table_name: 'planned_exercises', record_id: 'pe1' }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const sessions = makeStubBuilder();
    const setLogs = makeStubBuilder();
    const recos = makeStubBuilder();
    const blocks = makeStubBuilder();
    const wdays = makeStubBuilder();
    const plannedExercises = makeStubBuilder();
    const { client, from } = makeSupabaseStub({
      sessions: sessions.builder,
      set_logs: setLogs.builder,
      recommendations: recos.builder,
      blocks: blocks.builder,
      workout_days: wdays.builder,
      planned_exercises: plannedExercises.builder,
    });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(6);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(6);
    expect(result.results.every((r) => r.status === 'pushed')).toBe(true);

    // 6 upserts (un par table)
    expect(sessions.upsert).toHaveBeenCalledTimes(1);
    expect(setLogs.upsert).toHaveBeenCalledTimes(1);
    expect(recos.upsert).toHaveBeenCalledTimes(1);
    expect(blocks.upsert).toHaveBeenCalledTimes(1);
    expect(wdays.upsert).toHaveBeenCalledTimes(1);
    expect(plannedExercises.upsert).toHaveBeenCalledTimes(1);

    // upsert appelé avec onConflict: 'id' — clé d'idempotence
    expect(sessions.upsert).toHaveBeenCalledWith(expect.any(Object), {
      onConflict: 'id',
    });

    // Toutes marquées synced=1
    expect(state.queueRows.every((r) => r.synced === 1)).toBe(true);

    // 6 UPDATE sync_queue SET synced = 1 + 1 stamp synced_at sur sessions uniquement
    const markCalls = state.runCalls.filter((c) =>
      c[0].includes('UPDATE sync_queue SET synced = 1')
    );
    expect(markCalls).toHaveLength(6);

    const stampCalls = state.runCalls.filter((c) =>
      c[0].includes('UPDATE sessions SET synced_at')
    );
    expect(stampCalls).toHaveLength(1);
    expect(stampCalls[0][1][1]).toBe('s1');

    // Aucune autre table ne doit recevoir de stamp synced_at
    expect(
      state.runCalls.filter((c) => c[0].includes('UPDATE set_logs SET synced_at'))
    ).toHaveLength(0);
    expect(
      state.runCalls.filter((c) =>
        c[0].includes('UPDATE planned_exercises SET synced_at')
      )
    ).toHaveLength(0);
    // 6 upserts + 3 selects (conflict check sur sessions/set_logs/recommendations).
    // Les 3 tables programme (blocks, workout_days, planned_exercises) ne sont
    // pas conflict-checked → un seul from(table) chacune.
    expect(from).toHaveBeenCalledTimes(6 + 3);
  });

  // AC : push partiel — erreur Supabase au milieu, les autres continuent
  it('continues with remaining entries when one fails (Supabase error)', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({ id: 1, table_name: 'sessions', record_id: 's1' }),
        makeQueueRow({ id: 2, table_name: 'sessions', record_id: 's2' }),
        makeQueueRow({ id: 3, table_name: 'sessions', record_id: 's3' }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);

    let callCount = 0;
    const handles = makeStubBuilder();
    handles.upsert.mockImplementation(async () => {
      callCount += 1;
      if (callCount === 2) {
        return { error: { message: 'RLS violation' } };
      }
      return { error: null };
    });
    const { client } = makeSupabaseStub({ sessions: handles.builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(2);
    expect(result.failed).toBe(1);
    expect(result.results.map((r) => r.status)).toEqual([
      'pushed',
      'failed',
      'pushed',
    ]);

    const failed = result.results[1];
    expect(failed.status).toBe('failed');
    if (failed.status === 'failed') {
      expect(failed.error).toBe('RLS violation');
      expect(failed.recordId).toBe('s2');
    }

    // Entrées 1 et 3 marquées synced, entrée 2 reste à 0 (sera rejouée)
    expect(state.queueRows.find((r) => r.id === 1)?.synced).toBe(1);
    expect(state.queueRows.find((r) => r.id === 2)?.synced).toBe(0);
    expect(state.queueRows.find((r) => r.id === 3)?.synced).toBe(1);

    // Stamp synced_at uniquement pour les 2 succès
    const stampCalls = state.runCalls.filter((c) =>
      c[0].includes('UPDATE sessions SET synced_at')
    );
    expect(stampCalls).toHaveLength(2);
    expect(stampCalls.map((c) => c[1][1])).toEqual(['s1', 's3']);
  });

  // Erreur réseau (throw) ≠ erreur Supabase (error object) — les deux doivent être catchées
  it('continues when supabase call throws (network down)', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({ id: 1, record_id: 's1' }),
        makeQueueRow({ id: 2, record_id: 's2' }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder } = makeStubBuilder({
      upsertThrows: new Error('Network request failed'),
    });
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(0);
    expect(result.failed).toBe(2);
    expect(state.queueRows.every((r) => r.synced === 0)).toBe(true);
    if (result.results[0].status === 'failed') {
      expect(result.results[0].error).toBe('Network request failed');
    }
  });

  // AC : delete → utilise .delete().eq('id', recordId), pas le payload
  it('uses delete().eq("id", recordId) for delete actions', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 1,
          table_name: 'set_logs',
          record_id: 'sl-deleted',
          action: 'delete',
          payload: JSON.stringify({ id: 'sl-deleted' }),
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder, del, eq, upsert } = makeStubBuilder();
    const { client } = makeSupabaseStub({ set_logs: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(1);
    expect(upsert).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledTimes(1);
    expect(eq).toHaveBeenCalledWith('id', 'sl-deleted');
    expect(
      state.runCalls.some((c) => c[0].includes('SET synced_at'))
    ).toBe(false);
  });

  // delete sur sessions ne stampe pas synced_at (la ligne est partie)
  it('does not stamp synced_at on delete actions for sessions', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 1,
          table_name: 'sessions',
          record_id: 's-gone',
          action: 'delete',
          payload: JSON.stringify({ id: 's-gone' }),
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder } = makeStubBuilder();
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    await svc.push(db);

    expect(
      state.runCalls.some((c) => c[0].includes('UPDATE sessions SET synced_at'))
    ).toBe(false);
  });

  // Robustesse : payload JSON corrompu ne crash pas la boucle
  it('marks entry failed and continues when payload JSON is invalid', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({ id: 1, record_id: 's1', payload: '{not valid json' }),
        makeQueueRow({ id: 2, record_id: 's2' }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder, upsert } = makeStubBuilder();
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(1);
    expect(result.failed).toBe(1);
    if (result.results[0].status === 'failed') {
      expect(result.results[0].error).toBe('invalid_payload');
    }
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(state.queueRows.find((r) => r.id === 1)?.synced).toBe(0);
    expect(state.queueRows.find((r) => r.id === 2)?.synced).toBe(1);
  });

  // Ordre causal : la queue est lue ORDER BY created_at ASC (cf. getPendingSyncRecords)
  it('processes entries in created_at ascending order (causal)', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 10,
          record_id: 'first',
          payload: JSON.stringify({ id: 'first', user_id: 'u-1' }),
          created_at: '2026-05-09T08:00:00.000Z',
        }),
        makeQueueRow({
          id: 20,
          record_id: 'second',
          payload: JSON.stringify({ id: 'second', user_id: 'u-1' }),
          created_at: '2026-05-09T09:00:00.000Z',
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const callOrder: string[] = [];
    const handles = makeStubBuilder();
    handles.upsert.mockImplementation(async (payload: Record<string, unknown>) => {
      callOrder.push(payload.id as string);
      return { error: null };
    });
    const { client } = makeSupabaseStub({ sessions: handles.builder });

    const svc = createSyncService({ supabase: client });
    await svc.push(db);

    expect(callOrder).toEqual(['first', 'second']);
  });

  // Idempotence — invariant ADR-012/ADR-022 : upsert avec onConflict: 'id'
  // (insert et update sont traités identiquement)
  it('uses upsert with onConflict id for both insert and update actions', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({ id: 1, action: 'insert', record_id: 's1' }),
        makeQueueRow({ id: 2, action: 'update', record_id: 's2' }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder, upsert } = makeStubBuilder();
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    await svc.push(db);

    expect(upsert).toHaveBeenCalledTimes(2);
    upsert.mock.calls.forEach((call) => {
      expect(call[1]).toEqual({ onConflict: 'id' });
    });
  });

  // Pas de mutation de la SyncQueue pendant le push d'une autre entrée :
  // les entrées enqueuées après le snapshot ne sont pas traitées dans le même push
  it('snapshots queue at start — entries enqueued after are not processed', async () => {
    const state: MockDbState = {
      queueRows: [makeQueueRow({ id: 1, record_id: 's1' })],
      runCalls: [],
    };
    const db = makeMockDb(state);

    const { builder, upsert } = makeStubBuilder();
    upsert.mockImplementation(async () => {
      state.queueRows.push(makeQueueRow({ id: 99, record_id: 's-late' }));
      return { error: null };
    });
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(1);
    expect(upsert).toHaveBeenCalledTimes(1);
    // L'entrée tardive reste non traitée — sera prise au prochain push()
    expect(state.queueRows.find((r) => r.id === 99)?.synced).toBe(0);
  });
});

describe('createSyncService — getUnsynced()', () => {
  it('returns the same data as getPendingSyncRecords', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({ id: 1 }),
        makeQueueRow({ id: 2, synced: 1 }),
        makeQueueRow({ id: 3 }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { client } = makeSupabaseStub({});

    const svc = createSyncService({ supabase: client });
    const records = await svc.getUnsynced(db);

    expect(records).toHaveLength(2);
    expect(records.map((r) => r.id)).toEqual([1, 3]);
  });
});
