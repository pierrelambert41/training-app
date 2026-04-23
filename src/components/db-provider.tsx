import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabase } from '@/services/db';
import { DBContext } from '@/hooks/use-db';

interface DBProviderProps {
  children: React.ReactNode;
}

export function DBProvider({ children }: DBProviderProps) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    openDatabase()
      .then(setDb)
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : 'Unknown DB error';
        console.error('[DB] Failed to open database:', message);
        setError(message);
      });
  }, []);

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-red-500 text-center px-4">
          Erreur base de données locale : {error}
        </Text>
      </View>
    );
  }

  if (!db) {
    return null;
  }

  return <DBContext.Provider value={db}>{children}</DBContext.Provider>;
}
