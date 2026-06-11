import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAIContextProfile } from './ai-context-service';
import { buildBlockSummaryPrompt } from '../domain/prompts/block-summary-prompt';
import type { AIContext, AIContextProfile } from '../types/ai-context';
import type { BlockSummary } from '../types/ai-responses';
import { getBlockById } from '@/services/blocks';
import { getRecommendationsBySession, saveRecommendation } from '@/services/recommendations';
import type { Block, Recommendation } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { computeE1rm } from '@/lib/epley';

const TIMEOUT_BLOCK_SUMMARY_MS = 30_000;
const MAX_TOKENS_BLOCK_SUMMARY = 700;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type AIProxyResponse = {
  content: Array<{ type: 'text'; text: string }>;
};

type BlockSessionRow = {
  id: string;
  date: string;
};

type SetLogRow = {
  exercise_id: string;
  load: number | null;
  reps: number | null;
  completed: number;
};

type WeeklyExerciseAggregate = {
  date: string;
  avgLoad: number;
  totalVolume: number;
  e1rm?: number;
};

async function fetchBlockSessions(
  db: SQLiteDatabase,
  blockId: string,
  userId: string
): Promise<BlockSessionRow[]> {
  return db.getAllAsync<BlockSessionRow>(
    `SELECT id, date FROM sessions
     WHERE block_id = ? AND user_id = ? AND status = 'completed'
     ORDER BY date ASC`,
    [blockId, userId]
  );
}

async function countBlockSessions(
  db: SQLiteDatabase,
  blockId: string,
  userId: string
): Promise<number> {
  const row = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) AS total FROM sessions WHERE block_id = ? AND user_id = ?',
    [blockId, userId]
  );
  return row?.total ?? 0;
}

async function fetchExerciseNames(
  db: SQLiteDatabase,
  exerciseIds: string[]
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  for (const id of exerciseIds) {
    const row = await db.getFirstAsync<{ name: string }>(
      'SELECT name FROM exercises WHERE id = ?',
      [id]
    );
    names.set(id, row?.name ?? id);
  }
  return names;
}

/**
 * Agrège les SetLogs du bloc par exercice et par semaine.
 * Input volumineux sinon (5000-8000 tokens) : on envoie une entrée par
 * (exercice, semaine) au lieu d'une par SetLog. Cf. TA-138 notes techniques.
 */
async function buildWeeklyExerciseHistory(
  db: SQLiteDatabase,
  block: Block,
  sessions: BlockSessionRow[]
): Promise<NonNullable<AIContext['exerciseHistory']>> {
  const blockStartMs = Date.parse(block.startDate ?? sessions[0].date);

  type WeekBucket = { weekStartDate: string; loads: number[]; volume: number; e1rms: number[] };
  const byExerciseWeek = new Map<string, Map<number, WeekBucket>>();

  for (const session of sessions) {
    const logs = await db.getAllAsync<SetLogRow>(
      'SELECT exercise_id, load, reps, completed FROM set_logs WHERE session_id = ?',
      [session.id]
    );

    const sessionMs = Date.parse(session.date);
    const weekIndex = Math.max(0, Math.floor((sessionMs - blockStartMs) / WEEK_MS));

    for (const log of logs) {
      if (log.completed !== 1 || log.load == null || log.reps == null) continue;

      const weeks = byExerciseWeek.get(log.exercise_id) ?? new Map<number, WeekBucket>();
      const bucket = weeks.get(weekIndex) ?? {
        weekStartDate: new Date(blockStartMs + weekIndex * WEEK_MS).toISOString().slice(0, 10),
        loads: [],
        volume: 0,
        e1rms: [],
      };

      bucket.loads.push(log.load);
      bucket.volume += log.load * log.reps;
      if (log.reps > 0) bucket.e1rms.push(computeE1rm(log.load, log.reps));

      weeks.set(weekIndex, bucket);
      byExerciseWeek.set(log.exercise_id, weeks);
    }
  }

  const names = await fetchExerciseNames(db, Array.from(byExerciseWeek.keys()));

  return Array.from(byExerciseWeek.entries()).map(([exerciseId, weeks]) => ({
    exerciseId,
    exerciseName: names.get(exerciseId) ?? exerciseId,
    sessions: Array.from(weeks.entries())
      .sort(([a], [b]) => a - b)
      .map(([, bucket]): WeeklyExerciseAggregate => ({
        date: bucket.weekStartDate,
        avgLoad:
          Math.round((bucket.loads.reduce((s, l) => s + l, 0) / bucket.loads.length) * 10) / 10,
        totalVolume: bucket.volume,
        e1rm: bucket.e1rms.length > 0 ? Math.max(...bucket.e1rms) : undefined,
      })),
  }));
}

function buildDefaultProfile(): AIContextProfile {
  return {
    version: 0,
    user: {
      level: 'intermediate',
      goals: { primary: 'hypertrophy' },
      training_frequency: 3,
      preferred_unit: 'kg',
    },
    morphology: { strong_points: [], weak_points: [], injury_history: [] },
    exercise_preferences: { preferred: [], avoided: [], constraints: [] },
    performance_baselines: {},
    recent_highlights: [],
    coaching_style: 'direct',
    parallel_sports: [],
  };
}

/**
 * Exercices avec progression positive : e1rm (ou charge moyenne à défaut)
 * de la dernière semaine strictement supérieur à celui de la première.
 */
function findPositiveProgressions(
  history: NonNullable<AIContext['exerciseHistory']>
): string[] {
  const progressions: string[] = [];
  for (const exercise of history) {
    if (exercise.sessions.length < 2) continue;
    const first = exercise.sessions[0];
    const last = exercise.sessions[exercise.sessions.length - 1];
    const firstValue = first.e1rm ?? first.avgLoad;
    const lastValue = last.e1rm ?? last.avgLoad;
    if (lastValue > firstValue) {
      progressions.push(`${exercise.exerciseName} : +${Math.round((lastValue - firstValue) * 10) / 10}kg e1RM`);
    }
  }
  return progressions;
}

function buildFallbackSummary(
  block: Block,
  completedCount: number,
  complianceRate: number,
  history: NonNullable<AIContext['exerciseHistory']>
): BlockSummary {
  const progressions = findPositiveProgressions(history);
  return {
    title: block.title,
    duration_weeks: block.durationWeeks,
    overall_assessment: `Bloc "${block.title}" terminé : ${completedCount} séance${completedCount > 1 ? 's' : ''} complétée${completedCount > 1 ? 's' : ''} sur ${block.durationWeeks} semaine${block.durationWeeks > 1 ? 's' : ''}. Analyse IA indisponible.`,
    top_progressions: progressions,
    stagnations: [],
    compliance_note: `Taux de complétion : ${Math.round(complianceRate * 100)}%.`,
    next_block_recommendation: 'Poursuivez avec le bloc suivant du programme.',
  };
}

function parseBlockSummary(text: string): BlockSummary {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Claude response');
  const parsed = JSON.parse(match[0]) as Partial<BlockSummary>;
  if (!parsed.overall_assessment || !parsed.top_progressions) {
    throw new Error('Invalid BlockSummary shape');
  }
  return parsed as BlockSummary;
}

async function callClaudeForBlockSummary(
  supabase: SupabaseClient,
  context: AIContext
): Promise<BlockSummary> {
  const { system, messages } = buildBlockSummaryPrompt(context);

  const { data, error } = await supabase.functions.invoke<AIProxyResponse>('ai-proxy', {
    body: {
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content.map((c) => ('text' in c ? c.text : '')).join('\n'),
      })),
      max_tokens: MAX_TOKENS_BLOCK_SUMMARY,
      timeout_ms: TIMEOUT_BLOCK_SUMMARY_MS,
    },
  });

  if (error || !data) {
    throw new Error(`ai-proxy error: ${String(error)}`);
  }

  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error('ai-proxy empty response');
  }

  return parseBlockSummary(text);
}

function toBlockSummary(metadata: Record<string, unknown>): BlockSummary {
  return {
    title: (metadata.title as string) ?? '',
    duration_weeks: (metadata.duration_weeks as number) ?? 0,
    overall_assessment: (metadata.overall_assessment as string) ?? '',
    top_progressions: (metadata.top_progressions as string[]) ?? [],
    stagnations: (metadata.stagnations as string[]) ?? [],
    compliance_note: (metadata.compliance_note as string) ?? '',
    next_block_recommendation: (metadata.next_block_recommendation as string) ?? '',
  };
}

async function persistBlockSummaryRecommendation(
  db: SQLiteDatabase,
  blockId: string,
  closingSessionId: string,
  summary: BlockSummary,
  isFallback: boolean
): Promise<Recommendation> {
  return saveRecommendation(db, {
    id: generateUUID(),
    sessionId: closingSessionId,
    exerciseId: null,
    source: 'ai',
    type: 'summary',
    message: summary.overall_assessment,
    action: null,
    confidence: isFallback ? 0.3 : 0.85,
    metadata: {
      block_id: blockId,
      title: summary.title,
      duration_weeks: summary.duration_weeks,
      overall_assessment: summary.overall_assessment,
      top_progressions: summary.top_progressions,
      stagnations: summary.stagnations,
      compliance_note: summary.compliance_note,
      next_block_recommendation: summary.next_block_recommendation,
      fallback: isFallback,
    },
  });
}

/**
 * Synthèse IA d'un bloc d'entraînement terminé (TA-138).
 * Déclenchée à la demande (use-block-summary) ou quand block.status passe à
 * 'completed' — le service est idempotent, le futur trigger auto peut l'appeler tel quel.
 *
 * Agrège les SetLogs du bloc par (exercice, semaine), construit l'AIContext
 * (profil + historique agrégé + métadonnées bloc dans profile.current_block),
 * appelle Claude via ai-proxy et persiste la BlockSummary comme Recommendation
 * type 'summary', source 'ai', exercise_id null, ancrée sur la session de clôture
 * (dernière séance complétée du bloc).
 *
 * Une seule analyse IA par bloc : si une Recommendation type 'summary' source 'ai'
 * avec metadata.block_id existe déjà sur la session de clôture, elle est retournée
 * en cache sans rappeler l'IA. Le discriminant metadata.block_id distingue le résumé
 * de bloc du résumé de séance TA-135 (même type/source sur la même session).
 *
 * Fallback offline/erreur : résumé textuel depuis les métriques calculées
 * (compliance, séances complétées, progressions positives). Cf. docs/ai-strategy.md §2 et §4.
 */
export async function generateBlockSummary(
  db: SQLiteDatabase,
  blockId: string,
  userId: string,
  supabase: SupabaseClient | null
): Promise<BlockSummary> {
  const block = await getBlockById(db, blockId);
  if (!block) {
    throw new Error(`[block-summary] block not found: ${blockId}`);
  }

  const sessions = await fetchBlockSessions(db, blockId, userId);

  if (sessions.length === 0) {
    // Aucune session complétée : fallback sans persistance (pas de session d'ancrage FK).
    return buildFallbackSummary(block, 0, 0, []);
  }

  const closingSessionId = sessions[sessions.length - 1].id;

  const existingRecs = await getRecommendationsBySession(db, closingSessionId);
  const cached = existingRecs.find(
    (r) => r.type === 'summary' && r.source === 'ai' && r.metadata.block_id === blockId
  );
  if (cached) {
    return toBlockSummary(cached.metadata);
  }

  const totalSessions = await countBlockSessions(db, blockId, userId);
  const complianceRate =
    totalSessions > 0 ? Math.round((sessions.length / totalSessions) * 100) / 100 : 1;

  const history = await buildWeeklyExerciseHistory(db, block, sessions);

  const profile = await getAIContextProfile(db, userId);
  const effectiveProfile: AIContextProfile = {
    ...(profile ?? buildDefaultProfile()),
    current_block: {
      title: block.title,
      goal: block.goal,
      week: block.durationWeeks,
      total_weeks: block.durationWeeks,
      compliance_rate: complianceRate,
    },
  };

  const context: AIContext = {
    profile: effectiveProfile,
    rulesEngineRecommendations: [],
    exerciseHistory: history,
  };

  const fallback = buildFallbackSummary(block, sessions.length, complianceRate, history);

  let summary: BlockSummary;
  let usedFallback = false;

  if (supabase === null) {
    summary = fallback;
    usedFallback = true;
  } else {
    try {
      summary = await callClaudeForBlockSummary(supabase, context);
    } catch {
      summary = fallback;
      usedFallback = true;
    }
  }

  await persistBlockSummaryRecommendation(db, blockId, closingSessionId, summary, usedFallback);

  return summary;
}
