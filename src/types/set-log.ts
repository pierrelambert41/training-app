/**
 * SetLog — une série loggée pendant une séance (Phase 4).
 *
 * Source de vérité : docs/data-model.md §SetLog.
 * - load : poids dans l'unité utilisateur (kg ou lb selon UserProfile.preferred_unit).
 * - planned_exercise_id : NULL si la série a été ajoutée hors plan (freestyle).
 * - side : 'left' | 'right' pour exercices unilatéraux ; null pour bilatéral.
 */

export type SetLogSide = 'left' | 'right';

export interface SetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  plannedExerciseId: string | null;
  setNumber: number;
  // Cibles prévues (snapshot au moment de la création).
  targetLoad: number | null;
  targetReps: number | null;
  targetRir: number | null;
  // Données réalisées.
  load: number | null;
  reps: number | null;
  rir: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  // Méta.
  completed: boolean;
  side: SetLogSide | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewSetLogInput = {
  id: string;
  sessionId: string;
  exerciseId: string;
  plannedExerciseId?: string | null;
  setNumber: number;
  targetLoad?: number | null;
  targetReps?: number | null;
  targetRir?: number | null;
  load?: number | null;
  reps?: number | null;
  rir?: number | null;
  durationSeconds?: number | null;
  distanceMeters?: number | null;
  completed?: boolean;
  side?: SetLogSide | null;
  notes?: string | null;
};

export type UpdateSetLogInput = Partial<
  Pick<
    SetLog,
    | 'setNumber'
    | 'targetLoad'
    | 'targetReps'
    | 'targetRir'
    | 'load'
    | 'reps'
    | 'rir'
    | 'durationSeconds'
    | 'distanceMeters'
    | 'completed'
    | 'side'
    | 'notes'
  >
>;
