import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Program, ProgramQuestionnaire } from '@/types';
import { generateProgramWithAI } from './generate-program-service';
import { getAIContextProfile } from './ai-context-service';
import { buildDefaultProfile } from '../domain/default-profile';
import type { AIContextProfile } from '../types/ai-context';
import { getProgramById, updateProgram } from '@/services/programs';
import { getBlocksByStatus, insertBlock } from '@/services/blocks';
import { insertWorkoutDay } from '@/services/workout-days';
import { insertPlannedExercise } from '@/services/planned-exercises';

function clampFrequency(value: number | null): 3 | 4 | 5 | 6 | null {
  if (value === null) return null;
  if (value <= 3) return 3;
  if (value >= 6) return 6;
  return value as 4 | 5;
}

function clampDuration(value: number | null): ProgramQuestionnaire['maxSessionDurationMin'] {
  if (value === null) return null;
  const allowed = [45, 60, 75, 90] as const;
  return allowed.find((a) => a >= value) ?? 90;
}

/**
 * Reconstruit un ProgramQuestionnaire approché depuis le programme persisté +
 * le profil IA. Le questionnaire d'onboarding n'est pas persisté (store
 * éphémère Phase 3) : goal/fréquence/niveau viennent du programme, les
 * contraintes du profil. Approximation documentée — suffisante pour le
 * "même ProgramGenerationContext" de l'upgrade (TA-146).
 */
export function rebuildQuestionnaireFromProgram(
  program: Program,
  profile: AIContextProfile
): ProgramQuestionnaire {
  return {
    goal: program.goal,
    frequencyDays: clampFrequency(program.frequency),
    preferredDays: null,
    level: program.level,
    equipment: 'full_gym',
    injuries: profile.morphology.injury_history.join(', '),
    avoidExercises: profile.exercise_preferences.avoided.join(', '),
    priorityMuscles: [],
    sportsParallel: profile.parallel_sports.join(', '),
    maxSessionDurationMin: null,
    mixedPriority: null,
    volumeTolerance: null,
    importHistory: false,
    weightKg: profile.user.weight_kg !== undefined ? String(profile.user.weight_kg) : '',
    heightCm: profile.user.height_cm !== undefined ? String(profile.user.height_cm) : '',
    readinessAvg: null,
    attendancePercent: null,
  };
}

async function deletePlannedBlocks(db: SQLiteDatabase, programId: string): Promise<void> {
  // Cascade manuelle : planned_exercises → workout_days → blocks (planned uniquement).
  await db.runAsync(
    `DELETE FROM planned_exercises WHERE workout_day_id IN (
       SELECT wd.id FROM workout_days wd
       JOIN blocks b ON b.id = wd.block_id
       WHERE b.program_id = ? AND b.status = 'planned'
     )`,
    [programId]
  );
  await db.runAsync(
    `DELETE FROM workout_days WHERE block_id IN (
       SELECT id FROM blocks WHERE program_id = ? AND status = 'planned'
     )`,
    [programId]
  );
  await db.runAsync(`DELETE FROM blocks WHERE program_id = ? AND status = 'planned'`, [programId]);
}

/**
 * Remplace le programme fallback par une version IA (TA-146).
 *
 * Règle "tout ou rien sur les planned" : transaction SQLite —
 * - le bloc **active** en cours est conservé intact (jamais remplacé) ;
 * - tous les blocs **planned** sont supprimés et remplacés par le bloc IA
 *   (inséré en 'planned' si un bloc actif existe, sinon 'active') ;
 * - program.generationSource bascule à 'ai' (la bannière disparaît).
 *
 * En cas d'échec IA (AIProviderError / AIValidationExhaustedError), rien
 * n'est modifié — l'erreur remonte au caller (bannière reste visible).
 */
export async function upgradeFallbackProgramToAI(
  db: SQLiteDatabase,
  programId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<void> {
  const program = await getProgramById(db, programId);
  if (!program) {
    throw new Error(`[upgrade-program] program not found: ${programId}`);
  }

  const profile = (await getAIContextProfile(db, userId)) ?? buildDefaultProfile();
  const questionnaire = rebuildQuestionnaireFromProgram(program, profile);

  // L'appel IA se fait HORS transaction (long, réseau) — la transaction ne
  // couvre que la bascule SQLite.
  const aiResult = await generateProgramWithAI(db, userId, questionnaire, supabase);

  const activeBlocks = await getBlocksByStatus(db, programId, 'active');
  const hasActiveBlock = activeBlocks.length > 0;

  await db.execAsync('BEGIN TRANSACTION');
  try {
    await deletePlannedBlocks(db, programId);

    await insertBlock(db, {
      ...aiResult.block,
      programId,
      status: hasActiveBlock ? 'planned' : 'active',
      generationSource: 'ai',
    });
    for (const { day, plannedExercises } of aiResult.days) {
      await insertWorkoutDay(db, day);
      for (const pe of plannedExercises) {
        await insertPlannedExercise(db, pe);
      }
    }

    await updateProgram(db, programId, { generationSource: 'ai' });

    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }
}
