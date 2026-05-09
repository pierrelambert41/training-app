import { resolveConflict } from './conflict-resolution';

describe('resolveConflict', () => {
  // AC : pas de ligne remote → upsert normal
  it("returns 'no_remote' when remote is null", () => {
    expect(
      resolveConflict({
        local: '2026-05-09T10:00:00.000Z',
        remote: null,
      })
    ).toBe('no_remote');
  });

  // AC : remote.updated_at > local.updated_at → remote gagne
  it("returns 'remote' when remote is strictly newer", () => {
    expect(
      resolveConflict({
        local: '2026-05-09T10:00:00.000Z',
        remote: '2026-05-09T11:00:00.000Z',
      })
    ).toBe('remote');
  });

  // AC : local.updated_at > remote.updated_at → local gagne
  it("returns 'local' when local is strictly newer", () => {
    expect(
      resolveConflict({
        local: '2026-05-09T11:00:00.000Z',
        remote: '2026-05-09T10:00:00.000Z',
      })
    ).toBe('local');
  });

  // AC : égalité → local gagne (>= remote, upsert idempotent)
  it("returns 'local' when timestamps are equal", () => {
    expect(
      resolveConflict({
        local: '2026-05-09T10:00:00.000Z',
        remote: '2026-05-09T10:00:00.000Z',
      })
    ).toBe('local');
  });

  // Edge case : différence en millisecondes — la résolution est strictement
  // sur le timestamp parsé, pas sur la string brute.
  it('compares at millisecond precision', () => {
    expect(
      resolveConflict({
        local: '2026-05-09T10:00:00.000Z',
        remote: '2026-05-09T10:00:00.001Z',
      })
    ).toBe('remote');
    expect(
      resolveConflict({
        local: '2026-05-09T10:00:00.001Z',
        remote: '2026-05-09T10:00:00.000Z',
      })
    ).toBe('local');
  });

  // Defensive : local null → remote gagne s'il est présent et valide
  it("returns 'remote' when local is null but remote is present", () => {
    expect(
      resolveConflict({
        local: null,
        remote: '2026-05-09T10:00:00.000Z',
      })
    ).toBe('remote');
  });

  it("returns 'remote' when local is undefined but remote is present", () => {
    expect(
      resolveConflict({
        local: undefined,
        remote: '2026-05-09T10:00:00.000Z',
      })
    ).toBe('remote');
  });

  // Robustesse : remote corrompu → no_remote (préserver la donnée locale)
  it("returns 'no_remote' when remote timestamp is unparseable", () => {
    expect(
      resolveConflict({
        local: '2026-05-09T10:00:00.000Z',
        remote: 'not-a-date',
      })
    ).toBe('no_remote');
  });

  // Robustesse : local corrompu mais remote OK → remote gagne (defensive)
  it("returns 'remote' when local timestamp is unparseable but remote is valid", () => {
    expect(
      resolveConflict({
        local: 'not-a-date',
        remote: '2026-05-09T10:00:00.000Z',
      })
    ).toBe('remote');
  });

  // Pureté : appels successifs avec même input → même output
  it('is deterministic across repeated calls', () => {
    const input = {
      local: '2026-05-09T10:00:00.000Z',
      remote: '2026-05-09T11:00:00.000Z',
    };
    const r1 = resolveConflict(input);
    const r2 = resolveConflict(input);
    const r3 = resolveConflict(input);
    expect([r1, r2, r3]).toEqual(['remote', 'remote', 'remote']);
  });
});
