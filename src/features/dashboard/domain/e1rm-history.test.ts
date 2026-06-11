import { buildE1rmHistory, e1rmDelta } from './e1rm-history';

describe('buildE1rmHistory', () => {
  it('garde le meilleur e1RM par séance (Epley)', () => {
    const points = buildE1rmHistory([
      // 100x5 → 116.7 ; 105x2 → 112 : le 100x5 gagne
      { date: '2026-06-01', load: 100, reps: 5 },
      { date: '2026-06-01', load: 105, reps: 2 },
      { date: '2026-06-05', load: 102.5, reps: 5 },
    ]);
    expect(points).toEqual([
      { date: '2026-06-01', e1rm: 116.7 },
      { date: '2026-06-05', e1rm: 119.6 },
    ]);
  });

  it('ignore les sets sans load/reps exploitables', () => {
    const points = buildE1rmHistory([
      { date: '2026-06-01', load: null, reps: 8 },
      { date: '2026-06-01', load: 80, reps: null },
      { date: '2026-06-01', load: 0, reps: 8 },
      { date: '2026-06-01', load: -5, reps: 8 },
    ]);
    expect(points).toEqual([]);
  });

  it('trie chronologiquement même si les rows arrivent désordonnés', () => {
    const points = buildE1rmHistory([
      { date: '2026-06-08', load: 100, reps: 5 },
      { date: '2026-06-01', load: 95, reps: 5 },
    ]);
    expect(points.map((p) => p.date)).toEqual(['2026-06-01', '2026-06-08']);
  });
});

describe('e1rmDelta', () => {
  it('retourne le delta dernier - premier', () => {
    expect(
      e1rmDelta([
        { date: '2026-06-01', e1rm: 110 },
        { date: '2026-06-05', e1rm: 112.5 },
      ])
    ).toBe(2.5);
  });

  it('retourne null avec moins de 2 points', () => {
    expect(e1rmDelta([{ date: '2026-06-01', e1rm: 110 }])).toBeNull();
    expect(e1rmDelta([])).toBeNull();
  });
});
