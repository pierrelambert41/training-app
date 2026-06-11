/**
 * Calcul de chargement de barre (plate calculator).
 * Toutes les valeurs sont dans l'UNITÉ D'AFFICHAGE de l'exercice (kg ou lb) —
 * le composant appelant convertit vers/depuis le kg canonique.
 */
import type { WeightUnit } from '@/lib/units';

/** Jeux de plaques standards par unité (par côté). */
export const PLATE_SETS: Record<WeightUnit, number[]> = {
  kg: [25, 20, 15, 10, 5, 2.5, 1.25],
  lb: [45, 35, 25, 10, 5, 2.5],
};

/** Total barre + 2 × somme des plaques d'un côté. */
export function totalFromPlates(barWeight: number, platesPerSide: number[]): number {
  const side = platesPerSide.reduce((acc, p) => acc + p, 0);
  return Math.round((barWeight + 2 * side) * 100) / 100;
}

/**
 * Suggestion gloutonne de plaques par côté pour atteindre une charge cible.
 * Retourne null si la cible est sous le poids de barre. Approximation par
 * en-dessous si la cible ne tombe pas sur un chargement exact.
 */
export function suggestPlatesPerSide(
  target: number,
  barWeight: number,
  plates: number[]
): number[] | null {
  if (target < barWeight) return null;
  let remaining = (target - barWeight) / 2;
  const result: number[] = [];
  for (const plate of [...plates].sort((a, b) => b - a)) {
    while (remaining >= plate - 1e-9) {
      result.push(plate);
      remaining -= plate;
    }
  }
  return result;
}

/** Regroupe les plaques par valeur pour l'affichage : [25, 25, 5] → [{plate: 25, count: 2}, {plate: 5, count: 1}]. */
export function groupPlates(platesPerSide: number[]): Array<{ plate: number; count: number }> {
  const byValue = new Map<number, number>();
  for (const p of platesPerSide) {
    byValue.set(p, (byValue.get(p) ?? 0) + 1);
  }
  return [...byValue.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([plate, count]) => ({ plate, count }));
}
