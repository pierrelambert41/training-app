import type { ConflictWinner } from '../types/conflict';

/**
 * Résolution last-write-wins (TA-122) : compare deux timestamps ISO 8601.
 *
 * Règles (alignées sur les AC du ticket) :
 * - `remote === null` (pas de ligne remote) → 'no_remote' (upsert normal).
 * - `remote > local` (strictement) → 'remote' gagne (skip push, copy remote→local).
 * - `local >= remote` → 'local' gagne (upsert normal).
 *
 * Cas dégénérés gérés conservateurement :
 * - `local === null/undefined` : on considère que le local n'a pas de
 *   timestamp valide → on laisse remote gagner si présent (le remote est
 *   plus fiable qu'un local sans `updated_at`). C'est défensif : en pratique
 *   les payloads produits par les repos ont toujours `updated_at`.
 * - Timestamps non parseables → traités comme "no_remote" (upsert normal),
 *   préfère écrire la donnée locale plutôt que la corrompre depuis remote.
 *
 * Fonction pure : aucun I/O, aucun side effect, déterministe.
 * Testable en isolation sans React, sans SQLite, sans Supabase.
 */
export function resolveConflict(input: {
  local: string | null | undefined;
  remote: string | null;
}): ConflictWinner {
  const { local, remote } = input;

  // Pas de ligne côté serveur — création normale.
  if (remote === null) return 'no_remote';

  const remoteMs = parseTimestamp(remote);
  if (remoteMs === null) {
    // Timestamp remote corrompu — on préfère ne pas y toucher, upsert normal.
    return 'no_remote';
  }

  // Local sans timestamp parseable : remote gagne par défaut (defensive).
  if (local === null || local === undefined) return 'remote';
  const localMs = parseTimestamp(local);
  if (localMs === null) return 'remote';

  // Strictement supérieur côté remote → remote gagne.
  // Égalité ou supériorité locale → local gagne (cohérent avec AC3).
  return remoteMs > localMs ? 'remote' : 'local';
}

function parseTimestamp(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}
