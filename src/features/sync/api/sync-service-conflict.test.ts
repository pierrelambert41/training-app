import { createSyncService } from './sync-service';
import {
  type MockDbState,
  makeMockDb,
  makeQueueRow,
  makeStubBuilder,
  makeSupabaseStub,
} from './sync-service-test-helpers';

// ============================================================
// TA-122 — Résolution de conflits last-write-wins (happy path)
// ============================================================
//
// Couvre les chemins nominaux du flow "fetch remote → resolveConflict →
// upsert ou copy remote→local → mark synced" :
//   - no_remote (pas de ligne distante)
//   - local_wins (timestamp local strictement plus récent)
//   - remote_wins (timestamp distant strictement plus récent, sessions/set_logs)
//   - recommendations utilisant created_at (pas d'updated_at, cf. SYNC-02)
//   - tables non-conflict-checked (programs/blocks/...) skip le check
//   - delete skip le check (ligne supprimée des deux côtés)
//
// Les chemins d'erreur (fetch throws, fetch returns error, copy throws) +
// l'accumulation des logs vivent dans `sync-service-conflict-errors.test.ts`.
// Split thématique pour respecter R6 (signal d'alerte > 250 lignes,
// refacto obligatoire > 400 lignes).

describe('createSyncService — conflict resolution (TA-122) — happy path', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // AC : pas de ligne remote → upsert classique, pas de conflit logué
  it('no remote row → upsert proceeds normally, no conflict log', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 1,
          table_name: 'sessions',
          record_id: 's1',
          payload: JSON.stringify({
            id: 's1',
            user_id: 'u-1',
            updated_at: '2026-05-09T10:00:00.000Z',
          }),
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    // selectData par défaut = null (pas de ligne remote).
    const { builder, upsert, select, maybeSingle } = makeStubBuilder();
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.conflicts).toEqual([]);
    expect(svc.getConflictLogs()).toEqual([]);

    // Le check de conflit a bien été tenté : 1 select + 1 maybeSingle.
    expect(select).toHaveBeenCalledTimes(1);
    expect(maybeSingle).toHaveBeenCalledTimes(1);

    // Upsert procède normalement.
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(state.queueRows[0].synced).toBe(1);
  });

  // AC : local.updated_at > remote.updated_at → upsert classique + conflit logué
  it('local wins → upsert proceeds with payload, conflict logged', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 1,
          table_name: 'sessions',
          record_id: 's1',
          payload: JSON.stringify({
            id: 's1',
            user_id: 'u-1',
            device_id: 'device-A',
            updated_at: '2026-05-09T11:00:00.000Z',
          }),
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder, upsert } = makeStubBuilder({
      selectData: {
        id: 's1',
        user_id: 'u-1',
        device_id: 'device-B',
        updated_at: '2026-05-09T10:00:00.000Z',
      },
    });
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(1);
    expect(result.failed).toBe(0);

    // Upsert appelé avec le payload local intact (device_id local préservé).
    expect(upsert).toHaveBeenCalledTimes(1);
    const [payloadArg, optsArg] = upsert.mock.calls[0];
    expect((payloadArg as Record<string, unknown>).device_id).toBe('device-A');
    expect(optsArg).toEqual({ onConflict: 'id' });

    // Conflit logué (winner: local).
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      table: 'sessions',
      recordId: 's1',
      winner: 'local',
      localTimestamp: '2026-05-09T11:00:00.000Z',
      remoteTimestamp: '2026-05-09T10:00:00.000Z',
    });
    expect(svc.getConflictLogs()).toHaveLength(1);

    // Outcome enrichi.
    if (result.results[0].status === 'pushed') {
      expect(result.results[0].conflictResolved).toBe('local');
    }

    expect(state.queueRows[0].synced).toBe(1);
  });

  // AC : remote.updated_at > local.updated_at → skip push, copy remote→local,
  // mark synced=1, conflit logué (winner: remote)
  it('remote wins → skips upsert, copies remote to local, marks synced', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 1,
          table_name: 'sessions',
          record_id: 's1',
          payload: JSON.stringify({
            id: 's1',
            user_id: 'u-1',
            device_id: 'device-A',
            updated_at: '2026-05-09T10:00:00.000Z',
          }),
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder, upsert, select } = makeStubBuilder({
      selectData: {
        id: 's1',
        user_id: 'u-1',
        workout_day_id: null,
        block_id: null,
        date: '2026-05-09',
        started_at: null,
        ended_at: null,
        status: 'completed',
        readiness: null,
        energy: null,
        motivation: null,
        sleep_quality: null,
        pre_session_notes: null,
        completion_score: 80,
        performance_score: 75,
        fatigue_score: 50,
        post_session_notes: 'remote notes',
        device_id: 'device-B',
        updated_at: '2026-05-09T12:00:00.000Z',
      },
    });
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(1);
    expect(result.failed).toBe(0);

    // Pas d'upsert : la version serveur EST la canonique.
    expect(upsert).not.toHaveBeenCalled();
    expect(select).toHaveBeenCalledTimes(1);

    // Conflit logué avec winner: remote.
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      table: 'sessions',
      recordId: 's1',
      winner: 'remote',
      localTimestamp: '2026-05-09T10:00:00.000Z',
      remoteTimestamp: '2026-05-09T12:00:00.000Z',
    });
    expect(svc.getConflictLogs()).toHaveLength(1);

    // Outcome marqué conflictResolved: remote.
    if (result.results[0].status === 'pushed') {
      expect(result.results[0].conflictResolved).toBe('remote');
    }

    // Copy remote→local exécuté : UPDATE sessions SET ... WHERE id = ?
    const copyCalls = state.runCalls.filter((c) =>
      c[0].includes('UPDATE sessions SET') && !c[0].includes('SET synced_at')
    );
    expect(copyCalls).toHaveLength(1);
    expect(copyCalls[0][1]).toEqual(
      expect.arrayContaining([
        'completed', // status
        80, // completion_score
        75, // performance_score
        'device-B', // device_id remote
        '2026-05-09T12:00:00.000Z', // updated_at remote
        's1', // WHERE id
      ])
    );

    // Entrée marquée synced=1 sans avoir poussé.
    expect(state.queueRows[0].synced).toBe(1);

    // Pas de stamp synced_at sur sessions quand remote gagne (la donnée
    // canonique est déjà côté serveur, pas besoin de "marquer comme vue").
    expect(
      state.runCalls.some((c) => c[0].includes('UPDATE sessions SET synced_at'))
    ).toBe(false);
  });

  // Cohérence : un set_logs dont remote est plus récent suit le même flow.
  it('set_logs remote wins → copies remote to local set_logs row', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 1,
          table_name: 'set_logs',
          record_id: 'sl1',
          payload: JSON.stringify({
            id: 'sl1',
            session_id: 'sess-1',
            exercise_id: 'ex-1',
            set_number: 1,
            updated_at: '2026-05-09T10:00:00.000Z',
          }),
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder, upsert } = makeStubBuilder({
      selectData: {
        id: 'sl1',
        session_id: 'sess-1',
        exercise_id: 'ex-1',
        planned_exercise_id: null,
        set_number: 1,
        target_load: 100,
        target_reps: 5,
        target_rir: 2,
        load: 102.5,
        reps: 5,
        rir: 1,
        duration_seconds: null,
        distance_meters: null,
        completed: true,
        side: null,
        notes: 'remote',
        updated_at: '2026-05-09T11:00:00.000Z',
      },
    });
    const { client } = makeSupabaseStub({ set_logs: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(upsert).not.toHaveBeenCalled();
    expect(result.conflicts[0]?.winner).toBe('remote');
    const copyCalls = state.runCalls.filter((c) =>
      c[0].includes('UPDATE set_logs SET')
    );
    expect(copyCalls).toHaveLength(1);
  });

  // Recommendations : pas d'updated_at, fallback sur created_at.
  it('recommendations uses created_at as conflict timestamp', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 1,
          table_name: 'recommendations',
          record_id: 'r1',
          payload: JSON.stringify({
            id: 'r1',
            session_id: 'sess-1',
            source: 'rules_engine',
            type: 'load_change',
            message: 'local',
            created_at: '2026-05-09T10:00:00.000Z',
          }),
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder, upsert } = makeStubBuilder({
      selectData: {
        id: 'r1',
        session_id: 'sess-1',
        exercise_id: null,
        source: 'rules_engine',
        type: 'load_change',
        message: 'remote',
        next_load: null,
        next_rep_target: null,
        next_rir_target: null,
        action: 'maintain',
        confidence: 0.9,
        metadata: {},
        // Plus récent côté remote → remote gagne.
        created_at: '2026-05-09T12:00:00.000Z',
      },
    });
    const { client } = makeSupabaseStub({ recommendations: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(upsert).not.toHaveBeenCalled();
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      table: 'recommendations',
      winner: 'remote',
      localTimestamp: '2026-05-09T10:00:00.000Z',
      remoteTimestamp: '2026-05-09T12:00:00.000Z',
    });
  });

  // Tables non-conflict-checked (programs, blocks, etc.) → pas de fetch
  it('non-checked tables skip the conflict check (no select call)', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 1,
          table_name: 'blocks',
          record_id: 'b1',
          payload: JSON.stringify({ id: 'b1', updated_at: '2026-05-09T10:00:00.000Z' }),
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder, select, upsert } = makeStubBuilder();
    const { client } = makeSupabaseStub({ blocks: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(1);
    expect(select).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(svc.getConflictLogs()).toEqual([]);
  });

  // Robustesse : delete sur sessions ne déclenche pas de check de conflit
  it('delete on sessions skips the conflict check', async () => {
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
    const { builder, select, del } = makeStubBuilder();
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    await svc.push(db);

    expect(select).not.toHaveBeenCalled();
    expect(del).toHaveBeenCalledTimes(1);
  });
});
