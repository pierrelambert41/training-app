import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Block } from '@/types';
import { ClaudeProvider } from './claude-provider';
import { getAIContextProfile } from './ai-context-service';
import { buildDefaultProfile } from '../domain/default-profile';
import { computeBlockStats, type BlockStatsSetLog } from '../domain/compute-block-stats';
import {
  transformAIOutputToBlock,
  type AIBlockResult,
} from '../domain/transform-ai-output';
import type { BlockRegenerationContext, ValidationContext } from '../types/ai-generation';
import { getBlockById } from '@/services/blocks';
import { searchExercises } from '@/services/exercises';
import { spreadDayOrders } from '@/services/program-generation';
import { buildProgressionConfig } from '@/services/progression-config';
import { generateUUID } from '@/utils/uuid';

type SessionCountRow = { total: number; completed: number };

type SetLogJoinRow = {
  exercise_id: string;
  exercise_name: string | null;
  session_date: string;
  load: number | null;
  reps: number | null;
  completed: number;
};

type FatigueRow = { avg_fatigue: number | null };

const BLOCK_GOALS = ['hypertrophy', 'strength', 'peaking', 'deload'] as const;

function isBlockGoal(value: string): value is (typeof BLOCK_GOALS)[number] {
  return (BLOCK_GOALS as readonly string[]).includes(value);
}

async function loadBlockSetLogs(
  db: SQLiteDatabase,
  blockId: string
): Promise<BlockStatsSetLog[]> {
  const rows = await db.getAllAsync<SetLogJoinRow>(
    `SELECT sl.exercise_id, e.name AS exercise_name, s.date AS session_date,
            sl.load, sl.reps, sl.completed
     FROM set_logs sl
     JOIN sessions s ON s.id = sl.session_id
     LEFT JOIN exercises e ON e.id = sl.exercise_id
     WHERE s.block_id = ?`,
    [blockId]
  );
  return rows.map((r) => ({
    exerciseId: r.exercise_id,
    exerciseName: r.exercise_name ?? r.exercise_id,
    sessionDate: r.session_date,
    load: r.load,
    reps: r.reps,
    completed: r.completed === 1,
  }));
}

async function loadSessionCounts(db: SQLiteDatabase, blockId: string): Promise<SessionCountRow> {
  const row = await db.getFirstAsync<SessionCountRow>(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
     FROM sessions WHERE block_id = ?`,
    [blockId]
  );
  return { total: row?.total ?? 0, completed: row?.completed ?? 0 };
}

async function loadDaysPerWeek(db: SQLiteDatabase, blockId: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM workout_days WHERE block_id = ?',
    [blockId]
  );
  return row?.count ?? 3;
}

async function loadAvgFatigue(db: SQLiteDatabase, blockId: string): Promise<number | null> {
  try {
    const row = await db.getFirstAsync<FatigueRow>(
      `SELECT AVG(fatigue_score) AS avg_fatigue FROM sessions
       WHERE block_id = ? AND status = 'completed' AND fatigue_score IS NOT NULL`,
      [blockId]
    );
    return row?.avg_fatigue ?? null;
  } catch {
    return null;
  }
}

/**
 * Régénération IA du bloc suivant, de bout en bout (ADR-028, TA-144) :
 * stats réelles du bloc précédent (computeBlockStats) → prompt continuité
 * 60-80% → validation déterministe (1 retry) → transformation vers Block.
 *
 * Ne persiste RIEN (caller responsibility) — le bloc retourné est 'planned' :
 * le bloc actif en cours n'est jamais remplacé (TA-146).
 * Erreurs (AIProviderError, AIValidationExhaustedError) : remontent au caller,
 * pas de retry silencieux ni d'enqueue TA-141.
 */
export async function regenerateBlockWithAI(
  db: SQLiteDatabase,
  previousBlockId: string,
  userId: string,
  reason: BlockRegenerationContext['reason'],
  supabase: SupabaseClient
): Promise<AIBlockResult> {
  const previousBlock: Block | null = await getBlockById(db, previousBlockId);
  if (!previousBlock) {
    throw new Error(`[regenerate-block] block not found: ${previousBlockId}`);
  }

  const profile = (await getAIContextProfile(db, userId)) ?? buildDefaultProfile();

  const [setLogs, counts, daysPerWeek, avgFatigueScore] = [
    await loadBlockSetLogs(db, previousBlockId),
    await loadSessionCounts(db, previousBlockId),
    await loadDaysPerWeek(db, previousBlockId),
    await loadAvgFatigue(db, previousBlockId),
  ];

  const stats = computeBlockStats({
    daysPerWeek,
    completedSessions: counts.completed,
    totalSessions: counts.total,
    setLogs,
    avgFatigueScore,
  });

  const catalogue = await searchExercises(db, '');
  const level = profile.user.level;

  const validationCtx: ValidationContext = {
    catalogue,
    userConstraints: {
      // Post-onboarding, les contraintes vivent dans le profil IA (pas de
      // questionnaire) : blessures via morphoTags interdits non disponibles →
      // le filtrage fin reste celui du prompt ; le validateur garde les règles dures.
      equipmentAllowed: Array.from(new Set(catalogue.flatMap((e) => e.equipment))),
      forbiddenMuscles: [],
      forbiddenMorphoTags: [],
      maxSessionDurationMin: null,
    },
    frequencyDays: daysPerWeek,
    level,
  };

  const context: BlockRegenerationContext = {
    profile,
    previousBlock,
    previousBlockStats: stats,
    reason,
  };

  const provider = new ClaudeProvider(supabase);
  const aiOutput = await provider.regenerateBlock(context, catalogue, validationCtx);

  return transformAIOutputToBlock(
    aiOutput,
    {
      programId: previousBlock.programId,
      blockTitle: `Bloc suivant — ${previousBlock.title}`,
      weekNumber: previousBlock.weekNumber + previousBlock.durationWeeks,
      goal:
        reason === 'goal_change' && isBlockGoal(profile.user.goals.primary)
          ? profile.user.goals.primary
          : previousBlock.goal,
      catalogue,
      level,
      source: 'ai',
      dayOrderSlots: spreadDayOrders(
        (daysPerWeek >= 3 && daysPerWeek <= 6 ? daysPerWeek : 3) as 3 | 4 | 5 | 6,
        null
      ),
      status: 'planned',
    },
    {
      generateId: generateUUID,
      buildProgressionConfig,
    }
  );
}
