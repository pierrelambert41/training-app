import { computeE1rm } from '@/lib/epley';

/** Set brut tel que remonté par l'API dashboard (un row par set complété). */
export type E1rmSetRow = {
  /** Date de la séance (YYYY-MM-DD). */
  date: string;
  load: number | null;
  reps: number | null;
};

export type E1rmPoint = {
  date: string;
  e1rm: number;
};

/** Exercice sélectionnable pour le graphe e1RM (au moins une séance loggée). */
export type LoggedExercise = {
  id: string;
  name: string;
  /** Nombre de séances complétées avec au moins un set loggé. */
  sessionCount: number;
};

/**
 * Meilleur e1RM par séance (Epley via src/lib/epley.ts — CALIB-01).
 * Les sets sans load/reps exploitables sont ignorés ; une séance sans set
 * valide ne produit pas de point. Tri chronologique.
 */
export function buildE1rmHistory(rows: E1rmSetRow[]): E1rmPoint[] {
  const bestByDate = new Map<string, number>();

  for (const row of rows) {
    if (row.load === null || row.reps === null || row.load <= 0 || row.reps <= 0) {
      continue;
    }
    const e1rm = computeE1rm(row.load, row.reps);
    const best = bestByDate.get(row.date);
    if (best === undefined || e1rm > best) {
      bestByDate.set(row.date, e1rm);
    }
  }

  return [...bestByDate.entries()]
    .map(([date, e1rm]) => ({ date, e1rm: Math.round(e1rm * 10) / 10 }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Delta entre le dernier et le premier point de la fenêtre, arrondi à 0.1. */
export function e1rmDelta(points: E1rmPoint[]): number | null {
  if (points.length < 2) return null;
  const first = points[0]!.e1rm;
  const last = points[points.length - 1]!.e1rm;
  return Math.round((last - first) * 10) / 10;
}
