import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDB } from './use-db';
import { getAlternativeExercises } from '@/services/exercises';
import { replaceExercise } from '@/services/planned-exercises';
import { useGenerationStore } from '@/stores/generation-store';
import { EQUIPMENT_AVAILABLE_BY_TYPE } from '@/services/program-generation';
import type { Exercise } from '@/types';

export function useAlternativeExercises(
  movementPattern: string,
  excludeId: string,
  searchQuery: string
) {
  const db = useDB();
  const equipment = useGenerationStore((s) => s.answers.equipment);
  const avoidExercises = useGenerationStore((s) => s.answers.avoidExercises);

  const availableEquipment =
    EQUIPMENT_AVAILABLE_BY_TYPE[equipment ?? 'full_gym'] ??
    EQUIPMENT_AVAILABLE_BY_TYPE.full_gym;

  const excludedNameTokens = (avoidExercises ?? '')
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);

  return useQuery({
    queryKey: [
      'alternative-exercises',
      movementPattern,
      excludeId,
      equipment,
      avoidExercises,
      searchQuery,
    ],
    queryFn: () =>
      getAlternativeExercises(db, {
        movementPattern,
        availableEquipment,
        excludedNameTokens,
        excludeIds: [excludeId],
        searchQuery,
      }),
    staleTime: 5 * 60 * 1000,
    enabled: movementPattern.length > 0,
  });
}

export function useReplaceExerciseMutation(workoutDayId: string) {
  const db = useDB();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      plannedExerciseId,
      newExerciseId,
    }: {
      plannedExerciseId: string;
      newExerciseId: string;
    }) => {
      const result = await replaceExercise(db, plannedExerciseId, newExerciseId);
      if (result === null) {
        throw new Error('Exercice introuvable en base de données.');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['workout-day-detail', workoutDayId],
      });
    },
  });
}

export type { Exercise };
