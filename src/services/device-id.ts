import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * device_id local stable, stocké dans la table `app_meta` (cf. db.ts v5).
 *
 * Pourquoi pas AsyncStorage ?
 *  - AsyncStorage est déjà utilisé pour persister la session Supabase Auth ;
 *    on évite de doubler les emplacements de persistance pour des données
 *    critiques de la couche data (sync conflict resolution).
 *  - Les autres entités locales (sessions, set_logs, etc.) vivent en SQLite —
 *    le device_id reste cohérent avec ce qu'il référence.
 *  - Pas de dépendance supplémentaire à charger pour un simple key/value.
 *
 * Le device_id est un UUID v4 généré au premier appel et persisté tel quel.
 * Il est suffisamment stable pour conflict resolution (Phase 6) :
 *   - Reste identique à travers les redémarrages d'app.
 *   - Est régénéré uniquement si la DB locale est réinitialisée
 *     (ex: réinstallation de l'app), ce qui est sémantiquement un nouvel
 *     "appareil" de toute façon.
 */

const DEVICE_ID_KEY = 'device_id';

function generateUuid(): string {
  // RFC 4122 v4 — n'utilise que crypto.getRandomValues si dispo (RN/Hermes >= 0.74),
  // sinon fallback sur Math.random (acceptable pour un identifiant non-sécurité).
  // On évite d'importer `uuid` côté runtime (déjà installé en devDep).
  const cryptoLike = (
    globalThis as typeof globalThis & {
      crypto?: { getRandomValues?: (arr: Uint8Array) => Uint8Array };
    }
  ).crypto;

  let bytes: Uint8Array;
  if (cryptoLike?.getRandomValues) {
    bytes = cryptoLike.getRandomValues(new Uint8Array(16));
  } else {
    bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Set version (4) and variant bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

/**
 * Idempotent : retourne le device_id existant ou en crée un nouveau au premier appel.
 * Concurrency : `INSERT OR IGNORE` garantit qu'un appel concurrent ne duplique pas
 * la ligne ; on relit ensuite la valeur effective pour rester cohérent même si
 * deux appels parallèles génèrent des UUIDs différents.
 */
export async function getOrCreateDeviceId(
  db: SQLiteDatabase
): Promise<string> {
  const existing = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    [DEVICE_ID_KEY]
  );
  if (existing?.value) return existing.value;

  const candidate = generateUuid();
  await db.runAsync(
    'INSERT OR IGNORE INTO app_meta (key, value) VALUES (?, ?)',
    [DEVICE_ID_KEY, candidate]
  );

  // Re-read pour gérer une éventuelle race : si un autre thread a inséré
  // une valeur entre temps, on retourne celle effectivement persistée.
  const persisted = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_meta WHERE key = ?',
    [DEVICE_ID_KEY]
  );
  return persisted?.value ?? candidate;
}
