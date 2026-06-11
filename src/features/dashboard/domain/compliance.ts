/**
 * Compliance au plan : % de séances réalisées vs planifiées écoulées sur le
 * bloc actif, au prorata du temps écoulé dans la semaine courante.
 * Jamais > 100 % : les séances extra ne gonflent pas le ratio.
 */

export type ComplianceInputs = {
  /** Date de début du bloc (YYYY-MM-DD). */
  blockStartDate: string;
  /** Durée totale du bloc en semaines. */
  durationWeeks: number;
  /** Nombre de séances planifiées par semaine (workout_days du bloc). */
  workoutDaysPerWeek: number;
  /** Dates (YYYY-MM-DD) des séances complétées rattachées au bloc. */
  completedDates: string[];
  /** Date du jour (YYYY-MM-DD). */
  today: string;
};

export type Compliance = {
  /** 0-100, arrondi à l'entier. */
  percentage: number;
  completedCount: number;
  /** Séances planifiées écoulées (arrondi à l'entier, ≥ 1). */
  plannedCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Retourne null si le bloc n'a pas commencé ou si moins d'une séance
 * planifiée n'est encore écoulée (bloc fraîchement démarré : un ratio
 * n'aurait pas de sens).
 */
export function computeCompliance(inputs: ComplianceInputs): Compliance | null {
  const { blockStartDate, durationWeeks, workoutDaysPerWeek, completedDates, today } =
    inputs;

  if (workoutDaysPerWeek <= 0 || durationWeeks <= 0) return null;

  const start = new Date(`${blockStartDate}T00:00:00.000Z`).getTime();
  const now = new Date(`${today}T00:00:00.000Z`).getTime();
  if (Number.isNaN(start) || now < start) return null;

  // Jours écoulés dans le bloc, bornés à sa durée totale (le jour de début
  // compte : J1 → 1/7e de semaine écoulée).
  const daysElapsed = Math.min(
    (now - start) / DAY_MS + 1,
    durationWeeks * 7
  );

  const plannedElapsed = (daysElapsed / 7) * workoutDaysPerWeek;
  if (plannedElapsed < 1) return null;

  const completedCount = completedDates.filter(
    (d) => d >= blockStartDate && d <= today
  ).length;

  const percentage = Math.min(
    100,
    Math.round((completedCount / plannedElapsed) * 100)
  );

  return {
    percentage,
    completedCount,
    plannedCount: Math.max(1, Math.round(plannedElapsed)),
  };
}
