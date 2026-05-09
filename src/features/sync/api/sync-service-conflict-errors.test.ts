import { createSyncService } from './sync-service';
import {
  type MockDbState,
  makeMockDb,
  makeQueueRow,
  makeStubBuilder,
  makeSupabaseStub,
} from './sync-service-test-helpers';

// ============================================================
// TA-122 — Résolution de conflits last-write-wins (chemins d'erreur)
// ============================================================
//
// Couvre les chemins de robustesse autour de runConflictCheck :
//   - fetch remote throws (réseau down) → entrée failed, upsert non tenté
//   - fetch remote returns Supabase error (RLS, etc.) → entrée failed
//   - copy remote→local throws → résout quand même remote_wins (verdict
//     respecté, log produit, warning loggué)
//   - cumul des logs in-memory à travers plusieurs push()
//
// Les chemins nominaux (no_remote/local_wins/remote_wins) vivent dans
// `sync-service-conflict.test.ts`. Split thématique pour respecter R6.

describe('createSyncService — conflict resolution (TA-122) — error paths', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Robustesse : échec du fetch remote → entrée failed, l'upsert n'est pas tenté
  it('fetch remote throws → entry marked failed, no upsert attempted', async () => {
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
    const { builder, upsert } = makeStubBuilder({
      selectThrows: new Error('Network down'),
    });
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.pushed).toBe(0);
    expect(result.failed).toBe(1);
    expect(upsert).not.toHaveBeenCalled();
    expect(state.queueRows[0].synced).toBe(0);
  });

  // Robustesse : erreur Supabase sur le fetch (RLS, etc.) → failed
  it('fetch remote returns error → entry marked failed', async () => {
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
    const { builder, upsert } = makeStubBuilder({
      selectError: 'permission denied',
    });
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    expect(result.failed).toBe(1);
    expect(upsert).not.toHaveBeenCalled();
    if (result.results[0].status === 'failed') {
      expect(result.results[0].error).toBe('permission denied');
    }
  });

  // Robustesse : `copyRemoteRowToLocal` throw n'invalide pas la résolution
  // remote_wins. Choix volontaire (cf. conflict-check.ts): la donnée serveur
  // EST canonique, on préfère assumer que le local divergera (un futur pull
  // réconciliera) plutôt que rejouer un push qui écraserait le serveur avec
  // une version locale stale. On vérifie ici les invariants observables :
  //   - outcome = 'pushed' avec conflictResolved: 'remote' (pas 'failed')
  //   - log de conflit produit (winner: remote)
  //   - upsert NON tenté (verdict respecté malgré l'échec de copy)
  //   - warning loggué (signal d'observabilité pour debug)
  // Hors scope ici : le scénario combiné où markEntrySynced throw aussi.
  // Dans ce double-échec, l'entrée resterait synced=0 et serait rejouée
  // (re-push potentiellement stale) — c'est l'arbitrage assumé "préférer
  // re-push à boucle infinie de copy fail".
  it('copy remote→local throws → still resolves as remote_wins, log produced', async () => {
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
      // Throw uniquement sur le SQL de copy (UPDATE sessions SET workout_day_id...).
      // Les autres SQL (UPDATE sync_queue SET synced = 1, etc.) restent OK.
      runShouldThrow: (sql) =>
        sql.includes('UPDATE sessions SET') && sql.includes('workout_day_id')
          ? new Error('SQLITE_LOCKED: database is locked')
          : null,
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
        completion_score: null,
        performance_score: null,
        fatigue_score: null,
        post_session_notes: null,
        device_id: 'device-B',
        updated_at: '2026-05-09T12:00:00.000Z',
      },
    });
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    const result = await svc.push(db);

    // Verdict respecté malgré l'échec de copy : remote_wins → pushed
    expect(result.pushed).toBe(1);
    expect(result.failed).toBe(0);
    expect(select).toHaveBeenCalledTimes(1);
    expect(upsert).not.toHaveBeenCalled();

    // Outcome enrichi conflictResolved: remote
    if (result.results[0].status === 'pushed') {
      expect(result.results[0].conflictResolved).toBe('remote');
    }

    // Log de conflit bien produit (winner: remote)
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]).toMatchObject({
      table: 'sessions',
      recordId: 's1',
      winner: 'remote',
      localTimestamp: '2026-05-09T10:00:00.000Z',
      remoteTimestamp: '2026-05-09T12:00:00.000Z',
    });

    // Tentative de copy bien faite (le SQL est tracé même si le run a throw)
    const attemptedCopy = state.runCalls.filter(
      (c) =>
        c[0].includes('UPDATE sessions SET') &&
        c[0].includes('workout_day_id')
    );
    expect(attemptedCopy).toHaveLength(1);

    // Warning loggué pour observabilité (chemin "copy remote→local failed")
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('copy remote→local failed'),
      expect.any(Error)
    );
  });

  // Cumul : getConflictLogs() persiste les logs d'un push à l'autre
  it('getConflictLogs() accumulates logs across multiple pushes', async () => {
    const state: MockDbState = {
      queueRows: [
        makeQueueRow({
          id: 1,
          table_name: 'sessions',
          record_id: 's1',
          payload: JSON.stringify({
            id: 's1',
            user_id: 'u-1',
            updated_at: '2026-05-09T11:00:00.000Z',
          }),
        }),
      ],
      runCalls: [],
    };
    const db = makeMockDb(state);
    const { builder } = makeStubBuilder({
      selectData: {
        id: 's1',
        user_id: 'u-1',
        updated_at: '2026-05-09T10:00:00.000Z',
      },
    });
    const { client } = makeSupabaseStub({ sessions: builder });

    const svc = createSyncService({ supabase: client });
    await svc.push(db);
    expect(svc.getConflictLogs()).toHaveLength(1);

    // Deuxième push avec une autre entrée → cumul.
    state.queueRows.push(
      makeQueueRow({
        id: 2,
        table_name: 'sessions',
        record_id: 's2',
        payload: JSON.stringify({
          id: 's2',
          user_id: 'u-1',
          updated_at: '2026-05-09T11:00:00.000Z',
        }),
      })
    );
    await svc.push(db);
    expect(svc.getConflictLogs()).toHaveLength(2);
    expect(svc.getConflictLogs().map((l) => l.recordId)).toEqual(['s1', 's2']);
  });
});
