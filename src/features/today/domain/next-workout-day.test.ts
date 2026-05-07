import { getNextWorkoutDay, dayOrderToFrenchName } from './next-workout-day';
import type { WorkoutDay } from '@/types/workout-day';

const day = (dayOrder: number, title: string): WorkoutDay =>
  ({ dayOrder, title } as WorkoutDay);

describe('getNextWorkoutDay', () => {
  it('retourne null si workoutDays est vide', () => {
    expect(getNextWorkoutDay([], 3)).toBeNull();
  });

  it('retourne le prochain jour sans wrap-around', () => {
    const result = getNextWorkoutDay([day(2, 'Push'), day(4, 'Pull'), day(6, 'Legs')], 3);
    expect(result).toEqual({ title: 'Pull', dayOrder: 4 });
  });

  it('retourne le premier jour en cas de wrap-around (dernier slot)', () => {
    const result = getNextWorkoutDay([day(2, 'Push'), day(4, 'Pull'), day(6, 'Legs')], 6);
    expect(result).toEqual({ title: 'Push', dayOrder: 2 });
  });

  it('wrap-around quand todayDayOrder est après tous les slots', () => {
    const result = getNextWorkoutDay([day(1, 'A'), day(3, 'B')], 7);
    expect(result).toEqual({ title: 'A', dayOrder: 1 });
  });

  it('retourne le premier slot suivant quand plusieurs sont disponibles', () => {
    const result = getNextWorkoutDay([day(5, 'X'), day(2, 'Y'), day(4, 'Z')], 1);
    expect(result).toEqual({ title: 'Y', dayOrder: 2 });
  });
});

describe('dayOrderToFrenchName', () => {
  it('convertit les dayOrder 1-7 en noms français', () => {
    expect(dayOrderToFrenchName(1)).toBe('lundi');
    expect(dayOrderToFrenchName(4)).toBe('jeudi');
    expect(dayOrderToFrenchName(7)).toBe('dimanche');
  });

  it("retourne une chaîne vide pour un dayOrder inconnu", () => {
    expect(dayOrderToFrenchName(0)).toBe('');
    expect(dayOrderToFrenchName(8)).toBe('');
  });
});
