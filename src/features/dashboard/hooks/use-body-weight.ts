import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { useAuthStore } from '@/features/auth';
import { getBodyMetricsSince, upsertBodyWeight } from '@/services/body-metrics';
import { generateUUID } from '@/utils/uuid';

const WINDOW_DAYS = 90;

/**
 * Courbe de poids (90 jours) + saisie rapide de la pesée du jour.
 */
export function useBodyWeight() {
  const db = useDB();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const query = useQuery({
    queryKey: ['dashboard-body-weight', userId],
    queryFn: () => getBodyMetricsSince(db, userId!, since),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: (weightKg: number) =>
      upsertBodyWeight(db, generateUUID(), {
        userId: userId!,
        date: new Date().toISOString().slice(0, 10),
        weightKg,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-body-weight', userId] });
    },
  });

  return {
    metrics: query.data ?? [],
    isLoading: query.isLoading,
    saveWeight: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
