import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { useAuthStore } from '@/features/auth';
import { getRecoveryLogByDate, upsertRecoveryLog } from '@/services/recovery-logs';
import { generateUUID } from '@/utils/uuid';

export type DailyCheckinValues = {
  sleepQuality: number;
  energy: number;
  soreness: number;
  notes: string;
};

/**
 * Check-in quotidien de récupération (TA-148). Charge le log du jour et
 * expose la mutation d'upsert. Après saisie, invalide les recommandations
 * du jour pour que le fatigue score intègre la donnée au prochain calcul.
 */
export function useDailyCheckin() {
  const db = useDB();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const today = new Date().toISOString().slice(0, 10);

  const query = useQuery({
    queryKey: ['daily-checkin', userId, today],
    queryFn: () => getRecoveryLogByDate(db, userId!, today),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: (values: DailyCheckinValues) =>
      upsertRecoveryLog(db, generateUUID(), {
        userId: userId!,
        date: today,
        sleepQuality: values.sleepQuality,
        energy: values.energy,
        soreness: values.soreness,
        notes: values.notes.trim() === '' ? null : values.notes.trim(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-checkin', userId, today] });
      queryClient.invalidateQueries({ queryKey: ['today-recommendations'] });
    },
  });

  return {
    todayLog: query.data ?? null,
    isLoading: query.isLoading,
    save: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
