/**
 * Session — séance d'entraînement (logger Phase 4).
 *
 * Source de vérité : docs/data-model.md §Session.
 * Côté local SQLite : tous les TIMESTAMPTZ sont stockés en TEXT ISO 8601.
 * Côté Supabase : TIMESTAMPTZ natifs (cf. migration initiale 20260423000000).
 */

export type SessionStatus = 'in_progress' | 'completed' | 'abandoned';

export interface Session {
  id: string;
  userId: string;
  workoutDayId: string | null;
  blockId: string | null;
  /** Date de la séance (ISO 8601 yyyy-MM-dd, local). */
  date: string;
  /** ISO 8601 timestamp ; null tant que la séance n'a pas démarré. */
  startedAt: string | null;
  /** ISO 8601 timestamp ; null tant que la séance n'est pas terminée/abandonnée. */
  endedAt: string | null;
  status: SessionStatus;
  // Readiness pré-séance (1-10), tous nullables.
  readiness: number | null;
  energy: number | null;
  motivation: number | null;
  sleepQuality: number | null;
  preSessionNotes: string | null;
  // Scores calculés post-séance (Phase 5). Restent null à la création.
  completionScore: number | null;
  performanceScore: number | null;
  fatigueScore: number | null;
  postSessionNotes: string | null;
  /** Identifiant stable de l'appareil ayant créé la séance — conflict resolution Phase 6. */
  deviceId: string | null;
  /** Renseigné par le sync engine (Phase 6) après succès de push vers Supabase. */
  syncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewSessionInput = {
  id: string;
  userId: string;
  workoutDayId?: string | null;
  blockId?: string | null;
  date: string;
  startedAt?: string | null;
  endedAt?: string | null;
  status?: SessionStatus;
  readiness?: number | null;
  energy?: number | null;
  motivation?: number | null;
  sleepQuality?: number | null;
  preSessionNotes?: string | null;
  postSessionNotes?: string | null;
  /** Optionnel — résolu via getOrCreateDeviceId() si non fourni. */
  deviceId?: string | null;
};

export type UpdateSessionInput = Partial<
  Pick<
    Session,
    | 'workoutDayId'
    | 'blockId'
    | 'date'
    | 'startedAt'
    | 'endedAt'
    | 'status'
    | 'readiness'
    | 'energy'
    | 'motivation'
    | 'sleepQuality'
    | 'preSessionNotes'
    | 'completionScore'
    | 'performanceScore'
    | 'fatigueScore'
    | 'postSessionNotes'
  >
>;
