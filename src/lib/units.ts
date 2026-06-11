/**
 * Unités de poids — règle d'or : le stockage est TOUJOURS en kg (canonique),
 * la conversion kg/lb n'existe qu'à l'affichage et à la saisie.
 */

export type WeightUnit = 'kg' | 'lb';

export const KG_PER_LB = 0.45359237;

/** Incrément de chargement usuel par unité (petites plaques de 1.25 kg / 2.5 lb par côté). */
const DISPLAY_INCREMENT: Record<WeightUnit, number> = { kg: 2.5, lb: 5 };

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

/** Valeur affichable dans l'unité demandée, arrondie à 0.1 près. */
export function toDisplayWeight(kg: number, unit: WeightUnit): number {
  const value = unit === 'lb' ? kgToLb(kg) : kg;
  return Math.round(value * 10) / 10;
}

/** Valeur saisie dans l'unité d'affichage → kg canonique (précision 0.001). */
export function fromDisplayWeight(value: number, unit: WeightUnit): number {
  const kg = unit === 'lb' ? lbToKg(value) : value;
  return Math.round(kg * 1000) / 1000;
}

/** "82.5 kg" / "185 lb" — sans décimale inutile. */
export function formatWeight(kg: number, unit: WeightUnit): string {
  const value = toDisplayWeight(kg, unit);
  return `${value} ${unit}`;
}

/**
 * Arrondit une charge (kg canonique) pour que sa VALEUR AFFICHÉE tombe sur
 * l'incrément de plaques de l'unité : multiple de 2.5 kg ou de 5 lb.
 * À utiliser sur les recommandations du moteur (sinon une machine en lb
 * afficherait « 92.6 lb », inchargeable).
 */
export function roundToLoadableIncrement(kg: number, unit: WeightUnit): number {
  const increment = DISPLAY_INCREMENT[unit];
  if (unit === 'lb') {
    const lb = Math.round(kgToLb(kg) / increment) * increment;
    return Math.round(lbToKg(lb) * 1000) / 1000;
  }
  return Math.round(kg / increment) * increment;
}

type ExerciseUnitSource = { displayUnit?: WeightUnit | null } | null | undefined;

/** Unité effective d'un exercice : son override, sinon la préférence globale. */
export function resolveExerciseUnit(
  exercise: ExerciseUnitSource,
  preferredUnit: WeightUnit
): WeightUnit {
  return exercise?.displayUnit ?? preferredUnit;
}
