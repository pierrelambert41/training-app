export type SessionStatus = 'progression' | 'maintien' | 'allegee' | 'deload';

/**
 * Stub Phase 4 — Phase 5 remplacera avec le vrai moteur de progression.
 * Retourne 'progression' si la dernière séance est complétée, 'maintien' sinon.
 */
export function computeSessionStatus(lastSessionCompleted: boolean): SessionStatus {
  return lastSessionCompleted ? 'progression' : 'maintien';
}
