import { computeE1rm, computeBestE1rm, computeRecentAvgLoad } from './calibration';

describe('computeE1rm', () => {
  it('calcule 100kg x 5 reps → 116.67 (Epley)', () => {
    expect(computeE1rm(100, 5)).toBeCloseTo(116.67, 2);
  });

  it('calcule 80kg x 10 reps → 106.67', () => {
    expect(computeE1rm(80, 10)).toBeCloseTo(106.67, 2);
  });

  it('retourne load quand reps = 0 (1 + 0/30 = 1)', () => {
    expect(computeE1rm(100, 0)).toBe(100);
  });
});

describe('computeBestE1rm', () => {
  it('retourne le meilleur e1RM parmi plusieurs sets', () => {
    // 100kg x 5 = 116.67, 80kg x 10 = 106.67 → meilleur = 116.67
    const sets = [
      { load: 100, reps: 5 },
      { load: 80, reps: 10 },
    ];
    const result = computeBestE1rm(sets);
    expect(result).toBeCloseTo(116.67, 2);
  });

  it('retourne null pour un tableau vide', () => {
    expect(computeBestE1rm([])).toBeNull();
  });

  it('ignore les sets avec load = 0', () => {
    expect(computeBestE1rm([{ load: 0, reps: 5 }])).toBeNull();
  });

  it('ignore les sets avec reps = 0', () => {
    expect(computeBestE1rm([{ load: 100, reps: 0 }])).toBeNull();
  });

  it('retourne le meilleur e1RM quand un seul set valide', () => {
    const sets = [
      { load: 0, reps: 5 },
      { load: 100, reps: 5 },
    ];
    expect(computeBestE1rm(sets)).toBeCloseTo(116.67, 2);
  });
});

describe('computeRecentAvgLoad', () => {
  const refDate = '2026-01-28T00:00:00.000Z';

  it('calcule la moyenne des charges sur les 4 dernières semaines', () => {
    const sets = [
      { load: 100, reps: 5, sessionDateIso: '2026-01-20' },
      { load: 80, reps: 8, sessionDateIso: '2026-01-15' },
      { load: 90, reps: 6, sessionDateIso: '2026-01-10' },
    ];
    const result = computeRecentAvgLoad(sets, refDate);
    expect(result).toBeCloseTo((100 + 80 + 90) / 3, 5);
  });

  it('exclut les sessions antérieures à 4 semaines', () => {
    const sets = [
      { load: 100, reps: 5, sessionDateIso: '2026-01-20' },
      { load: 50, reps: 5, sessionDateIso: '2025-12-01' },
    ];
    const result = computeRecentAvgLoad(sets, refDate);
    expect(result).toBe(100);
  });

  it('retourne null si aucun set dans la fenêtre', () => {
    const sets = [
      { load: 100, reps: 5, sessionDateIso: '2025-10-01' },
    ];
    const result = computeRecentAvgLoad(sets, refDate);
    expect(result).toBeNull();
  });

  it('retourne null pour un tableau vide', () => {
    expect(computeRecentAvgLoad([], refDate)).toBeNull();
  });

  it('ignore les sets avec load = 0', () => {
    const sets = [
      { load: 0, reps: 5, sessionDateIso: '2026-01-20' },
    ];
    expect(computeRecentAvgLoad(sets, refDate)).toBeNull();
  });
});
