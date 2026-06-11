import { computeCompliance } from './compliance';

const BASE = {
  blockStartDate: '2026-06-01', // un lundi
  durationWeeks: 6,
  workoutDaysPerWeek: 4,
};

describe('computeCompliance', () => {
  it('calcule le prorata de la semaine courante', () => {
    // J11 (2026-06-11) : 11 jours écoulés → 11/7 * 4 ≈ 6.29 séances planifiées
    const result = computeCompliance({
      ...BASE,
      completedDates: ['2026-06-02', '2026-06-04', '2026-06-06', '2026-06-09', '2026-06-10'],
      today: '2026-06-11',
    });
    expect(result).toEqual({
      percentage: 80, // 5 / 6.286 = 79.5 → 80
      completedCount: 5,
      plannedCount: 6,
    });
  });

  it('plafonne à 100% quand les séances extra dépassent le plan', () => {
    const result = computeCompliance({
      ...BASE,
      completedDates: Array.from({ length: 14 }, (_, i) =>
        `2026-06-${String(i + 1).padStart(2, '0')}`
      ),
      today: '2026-06-14',
    });
    expect(result?.percentage).toBe(100);
  });

  it('retourne null sur un bloc fraîchement démarré (< 1 séance planifiée écoulée)', () => {
    expect(
      computeCompliance({
        ...BASE,
        completedDates: [],
        today: '2026-06-01', // J1 : 1/7 * 4 = 0.57 < 1
      })
    ).toBeNull();
  });

  it('retourne null si le bloc n\'a pas commencé ou inputs invalides', () => {
    expect(
      computeCompliance({ ...BASE, completedDates: [], today: '2026-05-31' })
    ).toBeNull();
    expect(
      computeCompliance({
        ...BASE,
        workoutDaysPerWeek: 0,
        completedDates: [],
        today: '2026-06-11',
      })
    ).toBeNull();
  });

  it('ignore les séances hors du bloc (avant le début)', () => {
    const result = computeCompliance({
      ...BASE,
      completedDates: ['2026-05-20', '2026-06-02'],
      today: '2026-06-08',
    });
    expect(result?.completedCount).toBe(1);
  });

  it('borne les jours écoulés à la durée du bloc (bloc terminé)', () => {
    // Bloc de 6 semaines = 42 jours = 24 séances planifiées max
    const result = computeCompliance({
      ...BASE,
      completedDates: ['2026-06-02'],
      today: '2026-09-01',
    });
    expect(result?.plannedCount).toBe(24);
  });
});
