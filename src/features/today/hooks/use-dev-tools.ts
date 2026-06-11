import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { SQLiteDatabase } from 'expo-sqlite';
import { useActiveProgramStore } from '@/stores/active-program-store';
import { useSessionStore } from '@/stores/session-store';
import { resetUserData } from '../api/reset-user-data';

/**
 * Actions des outils de dev de l'écran Aujourd'hui (seed, nettoyage, reset total).
 * Hook séparé pour respecter R5/boundaries : l'accès à la couche api/ passe par
 * un hook, pas par un composant.
 */
export function useDevTools(db: SQLiteDatabase, userId: string | undefined) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function seedTestData() {
    const { seedActiveBlock } = await import('@/dev/seed-active-block');
    const programId = await seedActiveBlock(db, userId ?? 'dev-user');
    router.push(`/(app)/programs/${programId}` as Parameters<typeof router.push>[0]);
  }

  async function seedAnalytics() {
    if (!userId) return;
    const { seedAnalyticsHistory } = await import('@/dev/seed-analytics-history');
    const result = await seedAnalyticsHistory(db, userId);
    // Tout le dashboard + la vue semaine + l'écran Aujourd'hui relisent SQLite.
    await queryClient.invalidateQueries();
    Alert.alert(
      'Mock analytics OK',
      `${result.sessions} séances, ${result.sets} sets, ${result.weighIns} pesées, ${result.checkins} check-ins.\n\nOuvre l'onglet Progrès pour les graphes, Programme pour la vue semaine.`
    );
  }

  async function cleanInactivePrograms() {
    if (!userId) return;
    const inactivePrograms = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM programs WHERE user_id = ? AND is_active = 0',
      [userId]
    );
    for (const { id: programId } of inactivePrograms) {
      const blocks = await db.getAllAsync<{ id: string }>('SELECT id FROM blocks WHERE program_id = ?', [programId]);
      for (const { id: blockId } of blocks) {
        const days = await db.getAllAsync<{ id: string }>('SELECT id FROM workout_days WHERE block_id = ?', [blockId]);
        for (const { id: dayId } of days) {
          await db.runAsync('DELETE FROM planned_exercises WHERE workout_day_id = ?', [dayId]);
        }
        await db.runAsync('DELETE FROM workout_days WHERE block_id = ?', [blockId]);
      }
      await db.runAsync('DELETE FROM blocks WHERE program_id = ?', [programId]);
      await db.runAsync('DELETE FROM programs WHERE id = ?', [programId]);
    }
    Alert.alert('DB nettoyee', `${inactivePrograms.length} programmes inactifs supprimes.`);
  }

  async function fullReset() {
    if (!userId) return;
    Alert.alert(
      'Reset total',
      'Efface tous les programmes, séances et historique. Irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Effacer tout',
          style: 'destructive',
          onPress: async () => {
            await resetUserData(db, userId);
            useActiveProgramStore.getState().reset();
            useSessionStore.getState().reset();
            Alert.alert('Reset OK', 'App remise à zéro — relance le processus de génération.');
          },
        },
      ]
    );
  }

  return { seedTestData, seedAnalytics, cleanInactivePrograms, fullReset };
}
