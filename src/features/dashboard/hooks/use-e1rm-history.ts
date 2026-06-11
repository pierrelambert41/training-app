import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { useAuthStore } from '@/features/auth';
import {
  getE1rmHistory,
  getExercisesWithHistory,
} from '../api/e1rm-history-service';

/**
 * Sélection d'exercice + historique e1RM pour la carte "Progression par
 * exercice". Par défaut : l'exercice avec le plus d'historique.
 */
export function useE1rmHistory() {
  const db = useDB();
  const userId = useAuthStore((s) => s.user?.id);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const exercisesQuery = useQuery({
    queryKey: ['dashboard-logged-exercises', userId],
    queryFn: () => getExercisesWithHistory(db, userId!),
    enabled: !!userId,
  });

  const exercises = exercisesQuery.data ?? [];
  const effectiveId = selectedId ?? exercises[0]?.id ?? null;

  const historyQuery = useQuery({
    queryKey: ['dashboard-e1rm-history', userId, effectiveId],
    queryFn: () => getE1rmHistory(db, userId!, effectiveId!),
    enabled: !!userId && !!effectiveId,
  });

  return {
    exercises,
    selectedExerciseId: effectiveId,
    selectExercise: setSelectedId,
    points: historyQuery.data ?? [],
    isLoading: exercisesQuery.isLoading || historyQuery.isLoading,
  };
}
