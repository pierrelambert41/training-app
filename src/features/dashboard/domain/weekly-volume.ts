/**
 * Volume hebdomadaire par groupe musculaire — doctrine projet : le volume se
 * compte en séries par muscle par semaine (comptage agoniste, méthodologie
 * des méta-analyses : 1 série compte pour chaque muscle de primary_muscles),
 * jamais en tonnage. Cohérent avec le comptage du moteur de génération.
 * Aucun seuil MEV/MAV/MRV affiché : comptages bruts uniquement (evidence-only).
 */

/** Set complété tel que remonté par l'API (un row par set). */
export type VolumeSetRow = {
  /** JSON brut de exercises.primary_muscles (ex: '["chest","triceps"]'). */
  primaryMuscles: string;
};

export type MuscleVolume = {
  muscle: string;
  sets: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bornes (lundi → dimanche, inclus) de la semaine à `offsetWeeks` de celle
 * contenant `referenceDate`. Convention lundi alignée sur WeekCalendar.
 * Dates en YYYY-MM-DD (comparaison lexicale = chronologique).
 */
export function weekBounds(
  referenceDate: string,
  offsetWeeks: number
): { start: string; end: string } {
  const ref = new Date(`${referenceDate}T00:00:00.000Z`);
  const jsDay = ref.getUTCDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(
    ref.getTime() + (diffToMonday + offsetWeeks * 7) * DAY_MS
  );
  const sunday = new Date(monday.getTime() + 6 * DAY_MS);
  return {
    start: monday.toISOString().slice(0, 10),
    end: sunday.toISOString().slice(0, 10),
  };
}

/**
 * Comptage agoniste : chaque set complété compte pour 1 série sur chacun de
 * ses muscles principaux (jamais les secondaires). Tri par volume décroissant
 * puis alphabétique (stable pour l'affichage).
 */
export function countWeeklySetsByMuscle(rows: VolumeSetRow[]): MuscleVolume[] {
  const counts = new Map<string, number>();

  for (const row of rows) {
    let muscles: unknown;
    try {
      muscles = JSON.parse(row.primaryMuscles);
    } catch {
      continue;
    }
    if (!Array.isArray(muscles)) continue;

    for (const muscle of muscles) {
      if (typeof muscle !== 'string' || muscle === '') continue;
      counts.set(muscle, (counts.get(muscle) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([muscle, sets]) => ({ muscle, sets }))
    .sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle));
}
