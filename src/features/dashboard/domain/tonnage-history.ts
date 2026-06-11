/** Types du suivi de tonnage par séance type (évolution à séance répétée). */

export type TonnageWorkoutDay = {
  id: string;
  title: string;
  sessionCount: number;
};

export type TonnagePoint = {
  sessionId: string;
  date: string;
  /** Tonnage de la séance en kg canonique. */
  tonnageKg: number;
  /** true si des exos bodyweight ont été comptés sans pesée connue. */
  missingBodyweight: boolean;
};
