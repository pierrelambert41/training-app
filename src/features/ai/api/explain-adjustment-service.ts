import type { SQLiteDatabase } from 'expo-sqlite';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAIContextProfile } from './ai-context-service';
import { buildExplainAdjustmentPrompt } from '../domain/prompts/explain-adjustment-prompt';
import type { AIContext, AIContextProfile, RulesEngineRecommendation } from '../types/ai-context';
import {
  getRecommendationById,
  updateRecommendation,
} from '@/services/recommendations';
import type { Recommendation } from '@/types';

const TIMEOUT_EXPLAIN_MS = 20_000;
const MAX_TOKENS_EXPLAIN = 300;

type AIProxyResponse = {
  content: Array<{ type: 'text'; text: string }>;
};

type ExplainAdjustmentResponse = {
  message: string;
  action?: string;
  confidence?: number;
  rationale?: string;
};

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

function toRulesEngineReco(rec: Recommendation): RulesEngineRecommendation {
  return {
    exerciseId: rec.exerciseId ?? '',
    type: rec.type,
    action: rec.action ?? 'maintain',
    message: rec.message,
    nextLoad: rec.nextLoad ?? undefined,
    nextRepTarget: rec.nextRepTarget ?? undefined,
    nextRirTarget: rec.nextRirTarget ?? undefined,
  };
}

function buildFallbackExplanation(rec: Recommendation): string {
  const parts: string[] = [rec.message];

  if (rec.action) {
    const actionLabel: Record<string, string> = {
      increase: 'Augmentation de charge recommandée',
      maintain: 'Maintien de la charge recommandé',
      decrease: 'Réduction de charge recommandée',
      deload: 'Semaine de deload recommandée',
      replace: "Remplacement d’exercice recommandé",
    };
    const label = actionLabel[rec.action];
    if (label) parts.push(label);
  }

  if (rec.nextLoad !== null && rec.nextLoad !== undefined) {
    parts.push(`Charge cible : ${rec.nextLoad} kg`);
  }

  return parts.join('. ');
}

function parseExplanationText(text: string): string {
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as ExplainAdjustmentResponse;
      return parsed.message ?? text.trim();
    } catch {
      // fall through
    }
  }
  return text.trim();
}

async function callClaudeForExplanation(
  supabase: SupabaseClient,
  context: AIContext,
  recommendation: Recommendation
): Promise<string> {
  const { system, messages } = buildExplainAdjustmentPrompt(context, {
    message: recommendation.message,
    action: recommendation.action ?? undefined,
    confidence: recommendation.confidence ?? 0.5,
  });

  const { data, error } = await supabase.functions.invoke<AIProxyResponse>('ai-proxy', {
    body: {
      system,
      messages: messages.map((m) => ({
        role: m.role,
        content: Array.isArray(m.content)
          ? m.content.map((c) => ('text' in c ? c.text : '')).join('\n')
          : m.content,
      })),
      max_tokens: MAX_TOKENS_EXPLAIN,
      timeout_ms: TIMEOUT_EXPLAIN_MS,
    },
  });

  if (error || !data) {
    throw new Error(`ai-proxy error: ${String(error)}`);
  }

  const text = data.content?.[0]?.text;
  if (!text) {
    throw new Error('ai-proxy empty response');
  }

  return parseExplanationText(text);
}

/**
 * Génère une explication IA pour une recommandation d'ajustement et la
 * persiste dans Recommendation.metadata.ai_explanation (UPDATE, pas INSERT).
 *
 * Déclenché à la demande via use-explain-adjustment.
 * Ne passe jamais par AIProvider.explainAdjustment (même pattern que TA-135 :
 * appel direct Edge Function pour avoir la visibilité fallback/succès).
 *
 * En cas d'absence de profil ou d'échec Claude : fallback textuel construit
 * depuis message + action + nextLoad de la Recommendation.
 *
 * Cf. docs/ai-strategy.md §2 (déclenchement à la demande), §4 (pipeline explication).
 */
export async function explainAdjustment(
  db: SQLiteDatabase,
  recommendationId: string,
  userId: string,
  supabase: SupabaseClient | null
): Promise<string> {
  const recommendation = await getRecommendationById(db, recommendationId);
  if (!recommendation) {
    throw new Error(`Recommendation not found: ${recommendationId}`);
  }

  const profile = await getAIContextProfile(db, userId);
  const effectiveProfile = profile ?? buildDefaultProfile();

  const context: AIContext = {
    profile: effectiveProfile,
    rulesEngineRecommendations: [toRulesEngineReco(recommendation)],
  };

  let explanation: string;
  let usedFallback = false;

  if (supabase === null) {
    explanation = buildFallbackExplanation(recommendation);
    usedFallback = true;
  } else {
    try {
      explanation = await callClaudeForExplanation(supabase, context, recommendation);
    } catch {
      explanation = buildFallbackExplanation(recommendation);
      usedFallback = true;
    }
  }

  const existingMetadata = recommendation.metadata ?? {};
  await updateRecommendation(db, recommendationId, {
    metadata: {
      ...existingMetadata,
      ai_explanation: explanation,
      ai_explanation_fallback: usedFallback,
    },
  });

  return explanation;
}
