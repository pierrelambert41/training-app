import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { WeightUnit } from '@/lib/units';

const PREFERRED_UNIT_KEY = 'preferred_unit';

type SettingsState = {
  preferredUnit: WeightUnit;
  isHydrated: boolean;
  hydrate: (db: SQLiteDatabase) => Promise<void>;
  setPreferredUnit: (db: SQLiteDatabase, unit: WeightUnit) => Promise<void>;
};

/**
 * Préférences locales de l'app, persistées dans app_meta (clé-valeur SQLite).
 * preferredUnit : unité d'AFFICHAGE globale — le stockage des charges reste
 * toujours en kg canonique (voir src/lib/units.ts).
 */
export const useSettingsStore = create<SettingsState>((set) => ({
  preferredUnit: 'kg',
  isHydrated: false,

  hydrate: async (db) => {
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?',
      [PREFERRED_UNIT_KEY]
    );
    set({
      preferredUnit: row?.value === 'lb' ? 'lb' : 'kg',
      isHydrated: true,
    });
  },

  setPreferredUnit: async (db, unit) => {
    await db.runAsync(
      'INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)',
      [PREFERRED_UNIT_KEY, unit]
    );
    set({ preferredUnit: unit });
  },
}));

/** Sélecteur pratique pour les composants d'affichage. */
export function usePreferredUnit(): WeightUnit {
  return useSettingsStore((s) => s.preferredUnit);
}
