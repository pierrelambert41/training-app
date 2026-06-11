import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ProgramQuestionnaire } from '@/types';
import { ClaudeProvider } from './claude-provider';
import { getAIContextProfile } from './ai-context-service';
import { buildDefaultProfile } from '../domain/default-profile';
import {
  transformAIOutputToProgram,
  type AIGenerationResult,
} from '../domain/transform-ai-output';
import type { ValidationContext } from '../types/ai-generation';
import { searchExercises } from '@/services/exercises';
import {
  buildFilterContext,
  filterCatalogue,
  spreadDayOrders,
} from '@/services/program-generation';
import { buildProgressionConfig } from '@/services/progression-config';
import { generateUUID } from '@/utils/uuid';

const DEFAULT_FREQUENCY = 3 as const;

/**
 * Génération de programme par IA, de bout en bout (ADR-028, TA-142) :
 * catalogue SQLite filtré (mêmes règles que le moteur Phase 3) → prompt +
 * appel ai-proxy → validation déterministe (TA-143, avec 1 retry) →
 * transformation vers la structure interne.
 *
 * Ne persiste RIEN (pattern ADR-013 : le caller persiste après validation
 * utilisateur). Les erreurs (AIProviderError, AIValidationExhaustedError)
 * remontent au caller — pas de retry automatique silencieux, l'UX TA-146
 * gère le remplacement par action explicite.
 */
export async function generateProgramWithAI(
  db: SQLiteDatabase,
  userId: string,
  questionnaire: ProgramQuestionnaire,
  supabase: SupabaseClient
): Promise<AIGenerationResult> {
  const profile = (await getAIContextProfile(db, userId)) ?? buildDefaultProfile();

  const catalogue = await searchExercises(db, '');
  const filterCtx = buildFilterContext({ userId, answers: questionnaire, catalogue });
  const filtered = filterCatalogue(catalogue, filterCtx);

  const frequencyDays = questionnaire.frequencyDays ?? DEFAULT_FREQUENCY;

  const validationCtx: ValidationContext = {
    catalogue: filtered,
    userConstraints: {
      equipmentAllowed: Array.from(filterCtx.equipmentAllowed),
      forbiddenMuscles: Array.from(filterCtx.forbiddenMuscles),
      forbiddenMorphoTags: Array.from(filterCtx.forbiddenMorphoTags),
      maxSessionDurationMin: questionnaire.maxSessionDurationMin,
    },
    frequencyDays,
    level: questionnaire.level ?? 'intermediate',
  };

  const provider = new ClaudeProvider(supabase);
  const aiOutput = await provider.generateProgram(
    { profile, questionnaire },
    filtered,
    validationCtx
  );

  return transformAIOutputToProgram(
    aiOutput,
    {
      userId,
      questionnaire,
      catalogue: filtered,
      source: 'ai',
      dayOrderSlots: spreadDayOrders(frequencyDays, questionnaire.preferredDays),
    },
    {
      generateId: generateUUID,
      buildProgressionConfig,
    }
  );
}
