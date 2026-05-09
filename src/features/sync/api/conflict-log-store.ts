import type { ConflictResolutionLog } from '../types/conflict';

/**
 * Store in-memory des logs de résolution de conflits (TA-122).
 *
 * Pas de persistance : ces logs sont une aide au debug, pas une donnée
 * canonique. Une instance par cycle de sync est conservée par le
 * SyncService — accessible via `getConflictLogs()`.
 *
 * Borne : on cap à 200 entrées (eviction FIFO) pour éviter une fuite
 * mémoire si jamais le sync rentre en boucle pathologique. La taille typique
 * d'un push est < 50 entrées ; 200 laisse de la marge sans risque.
 */

const MAX_ENTRIES = 200;

export type ConflictLogStore = {
  append: (log: ConflictResolutionLog) => void;
  getAll: () => ConflictResolutionLog[];
  clear: () => void;
};

export function createConflictLogStore(): ConflictLogStore {
  const entries: ConflictResolutionLog[] = [];

  return {
    append(log: ConflictResolutionLog): void {
      entries.push(log);
      if (entries.length > MAX_ENTRIES) {
        entries.splice(0, entries.length - MAX_ENTRIES);
      }
    },
    getAll(): ConflictResolutionLog[] {
      // Copie défensive : le caller ne peut pas muter notre buffer interne.
      return entries.slice();
    },
    clear(): void {
      entries.length = 0;
    },
  };
}
