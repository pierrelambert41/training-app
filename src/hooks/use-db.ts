import { createContext, useContext } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';

export const DBContext = createContext<SQLiteDatabase | null>(null);

export function useDB(): SQLiteDatabase {
  const db = useContext(DBContext);
  if (!db) {
    throw new Error('useDB must be used within a DBProvider');
  }
  return db;
}
