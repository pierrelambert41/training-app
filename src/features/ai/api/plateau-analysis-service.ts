import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAIContextProfile } from './ai-context-service';
import { buildPlateauAnalysisPrompt } from '../domain/prompts/plateau-analysis-prompt';
import type { AIContext, AIContextProfile } from '../types/ai-context';
import type { PlateauAnalysis } from '../types/ai-responses';
import { saveRecommendation } from '@/services/recommendations';
import type { Recommendation } from '@/types';
import { generateUUID } from '@/utils/uuid';
import { computeE1rm } from '@/lib/epley';

const TIMEOUT_PLATEAU_MS = 30_000;
const MAX_TOKENS_PLATEAU = 500;
const MAX_SESSIONS_HISTORY = 8;

type AIProxyResponse = {
  content: Array<{ type: 'text'; text: string }>;
};

type SetLogRow = {
  load: number | null;
  reps: number | null;
  rir: number | null;
  completed: number;
};

type ExerciseNameRow = {
  name: string;
};

type ExerciseHistorySession = {
  date: string;
  avgLoad: number;
  totalVolume: number;
  e1rm?: number;
};

type RecoveryLogRow = {
  date: string;
  sleep_quality: number | null;
  energy: number | null;
  soreness: number | null;
  notes: string | null;
};

async function fetchRecentSessionsForExercise(
  db: SQLiteDatabase,
  exerciseId: string,
  userId: string
): Promise<Array<{ sessionId: string; date: string }>> {
  type JoinRow = { id: string; date: string };
  const rows = await db.getAllAsync<JoinRow>(
    `SELECT DISTINCT s.id, s.date
     FROM sessions s
     JOIN set_logs sl ON sl.session_id = s.id
     WHERE s.user_id = ? AND sl.exercise_id = ? AND s.status = 'completed'
     ORDER BY s.date DESC
     LIMIT ?`,
    [userId, exerciseId, MAX_SESSIONS_HISTORY]
  );
  return rows.map((r) => ({ sessionId: r.id, date: r.date }));
}

async function fetchExerciseName(db: SQLiteDatabase, exerciseId: string): Promise<string> {
  const row = await db.getFirstAsync<ExerciseNameRow>(
    'SELECT name FROM exercises WHERE id = ?',
    [exerciseId]
  );
  return row?.name ?? exerciseId;
}

async function buildExerciseHistory(
  db: SQLiteDatabase,
  exerciseId: string,
  sessions: Array<{ sessionId: string; date: string }>
): Promise<ExerciseHistorySession[]> {
  const result: ExerciseHistorySession[] = [];

  for (const { sessionId, date } of sessions) {
    const logs = await db.getAllAsync<SetLogRow>(
      `SELECT load, reps, rir, completed FROM set_logs
       WHERE session_id = ? AND exercise_id = ?`,
      [sessionId, exerciseId]
    );

    const completedLogs = logs.filter((l) => l.completed === 1 && l.load != null && l.reps != null);
    if (completedLogs.length === 0) continue;

    const totalVolume = completedLogs.reduce(
      (sum, l) => sum + (l.load ?? 0) * (l.reps ?? 0),
      0
    );
    const avgLoad =
      completedLogs.reduce((sum, l) => sum + (l.load ?? 0), 0) / completedLogs.length;

    const e1rmValues = completedLogs
      .filter((l) => l.load != null && l.reps != null && l.reps > 0)
      .map((l) => computeE1rm(l.load!, l.reps!));
    const maxE1rm = e1rmValues.length > 0 ? Math.max(...e1rmValues) : undefined;

    result.push({ date, avgLoad, totalVolume, e1rm: maxE1rm });
  }

  return result;
}

async function fetchRecoveryLogs(
  db: SQLiteDatabase,
  userId: string,
  fromDate: string,
  toDate: string
): Promise<RecoveryLogRow[]> {
  try {
    return await db.getAllAsync<RecoveryLogRow>(
      `SELECT date, sleep_quality, energy, soreness, notes
       FROM recovery_logs
       WHERE user_id = ? AND date >= ? AND date <= ?
       ORDER BY date ASC`,
      [userId, fromDate, toDate]
    );
  } catch {
    return [];
  }
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

function buildFallbackAnalysis(exerciseName: string): PlateauAnalysis {
  return {
    exercise: exerciseName,
    plateau_duration_weeks: 0,
    probable_causes: [],
    suggestions: [
      "Vérifier la technique d'exécution",
      "Proposer une variante de l'exercice",
      'Ajuster le rep range',
      'Modifier le tempo',
    ],
  };
}

function parsePlateauAnalysis(text: string, fallback: PlateauAnalysis): PlateauAnalysis {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    const parsed = JSON.parse(match[0]) as Partial<PlateauAnalysis>;
    if (!parsed.suggestions || !parsed.probable_causes) return fallback;
    return parsed as PlateauAnalysis;
  } catch {
    return fallback;
  }
}

async function callClaudeForPlateau(
  supabase: SupabaseClient,
  context: AIContext,
  exerciseId: string,
  fallback: PlateauAnalysis
): Promise<PlateauAnalysis> {
  const { system, messages } = buildPlateauAnalysisPrompt(context, exerciseId);

  const { data, error } = await supabase.functions.invoke<AIProxyResponse>('ai-proxy', {
    body: {
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content.map((c) => ('text' in c ? c.text : '')).join('\n'),
      })),
      max_tokens: MAX_TOKENS_PLATEAU,
      timeout_ms: TIMEOUT_PLATEAU_MS,
    },
  });

  if (error || !data) {
    throw new Error(`ai-proxy error: ${String(error)}`);
  }

  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error('ai-proxy empty response');
  }

  return parsePlateauAnalysis(text, fallback);
}

async function persistPlateauRecommendation(
  db: SQLiteDatabase,
  exerciseId: string,
  sessionId: string,
  analysis: PlateauAnalysis,
  isFallback: boolean
): Promise<Recommendation> {
  return saveRecommendation(db, {
    id: generateUUID(),
    sessionId,
    exerciseId,
    source: 'ai',
    type: 'plateau',
    message: analysis.suggestions[0] ?? analysis.exercise,
    action: null,
    confidence: isFallback ? 0.3 : 0.85,
    metadata: {
      exercise: analysis.exercise,
      plateau_duration_weeks: analysis.plateau_duration_weeks,
      probable_causes: analysis.probable_causes,
      suggestions: analysis.suggestions,
      fallback: isFallback,
    },
  });
}

/**
 * Analyse IA d'un plateau de progression sur un exercice donné.
 * Déclenché à la demande uniquement (use-plateau-analysis, enabled: false).
 *
 * Collecte les 8 dernières séances contenant cet exercice, construit le contexte
 * AIContext (profil + historique exercice), appelle Claude via ai-proxy, et persiste
 * la PlateauAnalysis comme Recommendation type 'plateau' et source 'ai'.
 *
 * Le `sessionId` est la séance de référence (la plus récente avec l'exercice) :
 * il ancre la Recommendation dans la DB sans créer un couplage fort à une séance.
 *
 * Fallback si IA indisponible : suggestions standards docs/business-rules.md §6.
 * Cf. docs/ai-strategy.md §4.2 et §2 (déclenchement à la demande, basse priorité).
 */
export async function analyzePlateau(
  db: SQLiteDatabase,
  exerciseId: string,
  userId: string,
  supabase: SupabaseClient | null
): Promise<PlateauAnalysis> {
  const recentSessions = await fetchRecentSessionsForExercise(db, exerciseId, userId);
  const exerciseName = await fetchExerciseName(db, exerciseId);

  if (recentSessions.length === 0) {
    return buildFallbackAnalysis(exerciseName);
  }

  const referenceSessionId = recentSessions[0].sessionId;

  const history = await buildExerciseHistory(db, exerciseId, recentSessions);

  const dates = recentSessions.map((s) => s.date).sort();
  const fromDate = dates[0];
  const toDate = dates[dates.length - 1];
  const recoveryLogs = await fetchRecoveryLogs(db, userId, fromDate, toDate);

  const profile = await getAIContextProfile(db, userId);
  const effectiveProfile = profile ?? buildDefaultProfile();
  const fallback = buildFallbackAnalysis(exerciseName);

  const context: AIContext = {
    profile: effectiveProfile,
    rulesEngineRecommendations: [],
    exerciseHistory: [
      {
        exerciseId,
        exerciseName,
        sessions: history,
      },
    ],
    recoveryLogs,
  };

  let analysis: PlateauAnalysis;
  let usedFallback = false;

  if (supabase === null) {
    analysis = fallback;
    usedFallback = true;
  } else {
    try {
      analysis = await callClaudeForPlateau(supabase, context, exerciseId, fallback);
    } catch {
      analysis = fallback;
      usedFallback = true;
    }
  }

  await persistPlateauRecommendation(db, exerciseId, referenceSessionId, analysis, usedFallback);

  return analysis;
}
