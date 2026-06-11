import { useSettingsStore } from '@/stores/settings-store'; 
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAIContextProfile, refreshAIContextProfile } from './ai-context-service';
import { FallbackProvider } from './fallback-provider';
import { enqueueAIRetry } from './retry-queue';
import { buildSessionSummaryPrompt } from '../domain/prompts/session-summary-prompt';
import type { AIContext, AIContextProfile, RulesEngineRecommendation } from '../types/ai-context';
import type { SessionSummary } from '../types/ai-responses';
import {
  getRecommendationsBySession,
  saveRecommendation,
  updateRecommendation,
} from '@/services/recommendations';
import { getSessionById } from '@/services/sessions';
import { getSetLogsBySessionId } from '@/services/set-logs';
import type { SetLog } from '@/types';
import type { Recommendation } from '@/types';
import { generateUUID } from '@/utils/uuid';

const TIMEOUT_SUMMARY_MS = 30_000;
const MAX_TOKENS_SUMMARY = 600;

type SetLogForContext = {
  exerciseId: string;
  exerciseName: string;
  sets: Array<{
    setNumber: number;
    load?: number;
    reps?: number;
    rir?: number;
    completed: boolean;
  }>;
};

type ExerciseNameRow = {
  id: string;
  name: string;
};

type AIProxyResponse = {
  content: Array<{ type: 'text'; text: string }>;
};

async function readExerciseName(db: SQLiteDatabase, exerciseId: string): Promise<string> {
  const row = await db.getFirstAsync<ExerciseNameRow>(
    'SELECT id, name FROM exercises WHERE id = ?',
    [exerciseId]
  );
  return row?.name ?? exerciseId;
}

async function buildSetLogsForContext(
  db: SQLiteDatabase,
  sessionId: string
): Promise<SetLogForContext[]> {
  const rawLogs = await getSetLogsBySessionId(db, sessionId);

  const byExercise = new Map<string, SetLog[]>();
  for (const log of rawLogs) {
    const existing = byExercise.get(log.exerciseId) ?? [];
    existing.push(log);
    byExercise.set(log.exerciseId, existing);
  }

  const result: SetLogForContext[] = [];
  for (const [exerciseId, logs] of byExercise) {
    const exerciseName = await readExerciseName(db, exerciseId);
    result.push({
      exerciseId,
      exerciseName,
      sets: logs.map((l) => ({
        setNumber: l.setNumber,
        load: l.load ?? undefined,
        reps: l.reps ?? undefined,
        rir: l.rir ?? undefined,
        completed: l.completed,
      })),
    });
  }
  return result;
}

async function readPreviousSessionForWorkoutDay(
  db: SQLiteDatabase,
  workoutDayId: string,
  currentSessionId: string
): Promise<AIContext['previousSession'] | undefined> {
  type PrevSessionRow = {
    id: string;
    date: string;
    completion_score: number | null;
    performance_score: number | null;
  };

  const row = await db.getFirstAsync<PrevSessionRow>(
    `SELECT id, date, completion_score, performance_score
     FROM sessions
     WHERE workout_day_id = ? AND status = 'completed' AND id != ?
     ORDER BY date DESC
     LIMIT 1`,
    [workoutDayId, currentSessionId]
  );

  if (!row) return undefined;

  return {
    sessionId: row.id,
    date: row.date,
    completionScore: row.completion_score ?? undefined,
    performanceScore: row.performance_score ?? undefined,
  };
}

function toRulesEngineRecos(
  recommendations: Recommendation[]
): RulesEngineRecommendation[] {
  return recommendations
    .filter((r) => r.source === 'rules_engine')
    .map((r) => ({
      exerciseId: r.exerciseId ?? '',
      type: r.type,
      action: r.action ?? 'maintain',
      message: r.message,
      nextLoad: r.nextLoad ?? undefined,
      nextRepTarget: r.nextRepTarget ?? undefined,
      nextRirTarget: r.nextRirTarget ?? undefined,
    }));
}

function buildDefaultProfile(): AIContextProfile {
  return {
    version: 0,
    user: {
      level: 'intermediate',
      goals: { primary: 'hypertrophy' },
      training_frequency: 3,
      preferred_unit: useSettingsStore.getState().preferredUnit,
    },
    morphology: { strong_points: [], weak_points: [], injury_history: [] },
    exercise_preferences: { preferred: [], avoided: [], constraints: [] },
    performance_baselines: {},
    recent_highlights: [],
    coaching_style: 'direct',
    parallel_sports: [],
  };
}

async function upsertSummaryRecommendation(
  db: SQLiteDatabase,
  sessionId: string,
  summary: SessionSummary,
  isFallback: boolean
): Promise<Recommendation> {
  const metadata: Record<string, unknown> = {
    overall_rating: summary.overall_rating,
    highlights: summary.highlights,
    concerns: summary.concerns,
    fatigue_note: summary.fatigue_note,
    next_session_note: summary.next_session_note,
  };
  if (isFallback) {
    metadata.fallback = true;
  }

  const recs = await getRecommendationsBySession(db, sessionId);
  // metadata.block_id exclut le résumé de *bloc* TA-138 (même type/source possible
  // sur la session de clôture d'un bloc).
  const existing = recs.find(
    (r) => r.type === 'summary' && r.source === 'ai' && r.metadata.block_id === undefined
  );

  if (existing) {
    const updated = await updateRecommendation(db, existing.id, {
      message: summary.summary,
      metadata,
    });
    return updated ?? existing;
  }

  return saveRecommendation(db, {
    id: generateUUID(),
    sessionId,
    exerciseId: null,
    source: 'ai',
    type: 'summary',
    message: summary.summary,
    action: null,
    confidence: isFallback ? 0.3 : 0.9,
    metadata,
  });
}

function parseSessionSummary(text: string): SessionSummary {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON in Claude response');
  return JSON.parse(match[0]) as SessionSummary;
}

async function callClaudeForSummary(
  supabase: SupabaseClient,
  context: AIContext
): Promise<SessionSummary> {
  const { system, messages } = buildSessionSummaryPrompt(context);

  const { data, error } = await supabase.functions.invoke<AIProxyResponse>('ai-proxy', {
    body: {
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content.map((c) => c.text).join('\n'),
      })),
      max_tokens: MAX_TOKENS_SUMMARY,
      timeout_ms: TIMEOUT_SUMMARY_MS,
    },
  });

  if (error || !data) {
    throw new Error(`ai-proxy error: ${String(error)}`);
  }

  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error('ai-proxy empty response');
  }

  return parseSessionSummary(text);
}

/**
 * Génère un résumé IA de la séance et le persiste comme Recommendation
 * de type 'summary' et source 'ai'.
 *
 * Fire-and-forget depuis le caller (use-session-summary-trigger).
 * En cas d'absence de profil IA : FallbackProvider + refresh profil en arrière-plan + retry queue.
 * En cas d'échec Claude (réseau, 429, timeout) : FallbackProvider + entrée queue retry IA.
 * Si supabase est null (offline détecté côté caller) : FallbackProvider immédiat + retry queue.
 *
 * Cf. docs/ai-strategy.md §2 (déclenchement post-complétion locale, ADR-026) et §4.1.
 */
async function buildSessionSummaryContext(
  db: SQLiteDatabase,
  sessionId: string,
  userId: string
): Promise<{ context: AIContext; profileMissing: boolean } | null> {
  const session = await getSessionById(db, sessionId);
  if (!session) return null;

  const profile = await getAIContextProfile(db, userId);
  const profileMissing = profile === null;
  const effectiveProfile = profile ?? buildDefaultProfile();

  const setLogs = await buildSetLogsForContext(db, sessionId);

  const previousSession = session.workoutDayId
    ? await readPreviousSessionForWorkoutDay(db, session.workoutDayId, sessionId)
    : undefined;

  const recommendations = await getRecommendationsBySession(db, sessionId);
  const rulesEngineRecommendations = toRulesEngineRecos(recommendations);

  const context: AIContext = {
    profile: effectiveProfile,
    currentSession: {
      sessionId: session.id,
      workoutDayTitle: session.workoutDayId ?? 'Séance libre',
      date: session.date,
      setLogs,
      readiness: session.readiness ?? undefined,
      energy: session.energy ?? undefined,
      sleepQuality: session.sleepQuality ?? undefined,
    },
    previousSession,
    rulesEngineRecommendations,
  };

  return { context, profileMissing };
}

export async function generateAndStoreSessionSummary(
  db: SQLiteDatabase,
  sessionId: string,
  userId: string,
  supabase: SupabaseClient | null
): Promise<void> {
  const built = await buildSessionSummaryContext(db, sessionId, userId);
  if (!built) {
    console.error(`[session-summary] session not found: ${sessionId}`);
    return;
  }
  const { context, profileMissing } = built;

  if (profileMissing) {
    refreshAIContextProfile(db, userId).catch((e: unknown) => {
      console.error('[session-summary] background profile refresh failed', e);
    });
  }

  const skipClaude = supabase === null || profileMissing;

  if (skipClaude) {
    const fallback = new FallbackProvider();
    const summary = await fallback.generateSessionSummary(context);
    const saved = await upsertSummaryRecommendation(db, sessionId, summary, true);
    await enqueueAIRetry(db, {
      sessionId,
      recommendationId: saved.id,
      type: 'session_summary',
      payload: { sessionId, userId },
    });
    return;
  }

  let summary: SessionSummary;
  let usedFallback = false;

  try {
    summary = await callClaudeForSummary(supabase, context);
  } catch {
    const fallback = new FallbackProvider();
    summary = await fallback.generateSessionSummary(context);
    usedFallback = true;
  }

  const saved = await upsertSummaryRecommendation(db, sessionId, summary, usedFallback);

  if (usedFallback) {
    await enqueueAIRetry(db, {
      sessionId,
      recommendationId: saved.id,
      type: 'session_summary',
      payload: { sessionId, userId },
    });
  }
}

/**
 * Re-tente la génération du résumé IA d'une séance (worker TA-141).
 * Contrairement à generateAndStoreSessionSummary : pas de fallback, pas de
 * ré-enfilage — le worker gère les compteurs de tentatives.
 *
 * En cas de succès, upsertSummaryRecommendation remplace le résumé fallback
 * existant (metadata écrasé, fallback: false).
 *
 * @returns true si le résumé IA a été généré et persisté ; false sinon (à re-tenter).
 */
export async function retrySessionSummary(
  db: SQLiteDatabase,
  sessionId: string,
  userId: string,
  supabase: SupabaseClient | null
): Promise<boolean> {
  if (supabase === null) return false;

  const built = await buildSessionSummaryContext(db, sessionId, userId);
  // Séance disparue : rien à régénérer, l'entrée peut être close.
  if (!built) return true;

  try {
    const summary = await callClaudeForSummary(supabase, built.context);
    await upsertSummaryRecommendation(db, sessionId, summary, false);
    return true;
  } catch {
    return false;
  }
}
