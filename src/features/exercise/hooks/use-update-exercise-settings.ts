import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { updateExerciseSettings } from '@/services/exercises';
import type { ExerciseSettingsInput } from '@/services/exercises';

/**
 * Met à jour les réglages locaux d'un exercice (unité d'affichage, poids de barre).
 * Invalide la fiche exercice et la bibliothèque pour refléter le changement.
 */
export function useUpdateExerciseSettings(exerciseId: string) {
  const db = useDB();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (settings: ExerciseSettingsInput) =>
      updateExerciseSettings(db, exerciseId, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercise', exerciseId] });
      queryClient.invalidateQueries({ queryKey: ['exercises'] });
    },
  });
}
