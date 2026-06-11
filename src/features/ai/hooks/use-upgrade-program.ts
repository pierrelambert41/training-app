import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDB } from '@/hooks/use-db';
import { supabase } from '@/services/supabase';
import { upgradeFallbackProgramToAI } from '../api/upgrade-program-service';

export type UpgradeProgramState = {
  isUpgrading: boolean;
  error: string | null;
  upgrade: () => Promise<void>;
};

/**
 * Action "Mettre à jour" de la FallbackUpgradeBanner (TA-146) :
 * remplace le programme fallback par une version IA puis invalide la query
 * active-program. En cas d'échec : message non-bloquant, ré-essayable.
 */
export function useUpgradeProgram(
  programId: string,
  userId: string | undefined
): UpgradeProgramState {
  const db = useDB();
  const queryClient = useQueryClient();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upgrade = useCallback(async () => {
    if (!userId || isUpgrading) return;
    setIsUpgrading(true);
    setError(null);
    try {
      await upgradeFallbackProgramToAI(db, programId, userId, supabase);
      await queryClient.invalidateQueries({ queryKey: ['active-program', userId] });
    } catch {
      setError("Impossible de générer pour l'instant, réessayez plus tard.");
    } finally {
      setIsUpgrading(false);
    }
  }, [db, programId, userId, isUpgrading, queryClient]);

  return { isUpgrading, error, upgrade };
}
