import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIContext } from '../types/ai-context';
import type {
  BlockSummary,
  PlateauAnalysis,
  Recommendation,
  SessionSummary,
} from '../types/ai-responses';
import type { AIProvider } from './ai-provider';
import { FallbackProvider } from './fallback-provider';

const TIMEOUT_SUMMARY_MS = 30_000;
const TIMEOUT_PLATEAU_MS = 45_000;

type AIProxyRequest = {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  system?: string;
  max_tokens?: number;
  timeout_ms?: number;
};

type AIProxyResponse = {
  content: Array<{ type: 'text'; text: string }>;
};

/**
 * Provider Claude via Edge Function Supabase ai-proxy (ADR-025).
 * Jamais d'appel direct vers api.anthropic.com — la clé Anthropic vit
 * uniquement dans les secrets Supabase de l'Edge Function.
 *
 * En cas d'échec (réseau, timeout, rate-limit 429, erreur Claude) :
 * délègue silencieusement au FallbackProvider — jamais de throw vers l'UI.
 */
export class ClaudeProvider implements AIProvider {
  private readonly fallback: FallbackProvider;

  constructor(private readonly supabase: SupabaseClient) {
    this.fallback = new FallbackProvider();
  }

  private async invoke<T>(
    request: AIProxyRequest,
    parse: (text: string) => T,
    context: AIContext,
    fallbackFn: (ctx: AIContext) => Promise<T>
  ): Promise<T> {
    try {
      const { data, error } = await this.supabase.functions.invoke<AIProxyResponse>('ai-proxy', {
        body: request,
      });

      if (error || !data) {
        return fallbackFn(context);
      }

      const text = data.content?.[0]?.text;
      if (!text) {
        return fallbackFn(context);
      }

      return parse(text);
    } catch {
      return fallbackFn(context);
    }
  }

  private parseJson<T>(text: string): T {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON found in response');
    return JSON.parse(match[0]) as T;
  }

  async generateSessionSummary(context: AIContext): Promise<SessionSummary> {
    return this.invoke(
      {
        messages: [
          {
            role: 'user',
            content: `Génère un résumé de séance JSON pour : ${JSON.stringify(context.currentSession ?? {})}`,
          },
        ],
        max_tokens: 600,
        timeout_ms: TIMEOUT_SUMMARY_MS,
      },
      (text) => this.parseJson<SessionSummary>(text),
      context,
      (ctx) => this.fallback.generateSessionSummary(ctx)
    );
  }

  async generateRecommendation(context: AIContext): Promise<Recommendation> {
    return this.invoke(
      {
        messages: [
          {
            role: 'user',
            content: `Génère une recommandation JSON pour : ${JSON.stringify(context.rulesEngineRecommendations)}`,
          },
        ],
        max_tokens: 300,
        timeout_ms: TIMEOUT_SUMMARY_MS,
      },
      (text) => this.parseJson<Recommendation>(text),
      context,
      (ctx) => this.fallback.generateRecommendation(ctx)
    );
  }

  async generateBlockSummary(context: AIContext): Promise<BlockSummary> {
    return this.invoke(
      {
        messages: [
          {
            role: 'user',
            content: `Génère une synthèse de bloc JSON pour : ${JSON.stringify(context.profile.current_block ?? {})}`,
          },
        ],
        max_tokens: 800,
        timeout_ms: TIMEOUT_SUMMARY_MS,
      },
      (text) => this.parseJson<BlockSummary>(text),
      context,
      (ctx) => this.fallback.generateBlockSummary(ctx)
    );
  }

  async analyzePlateau(context: AIContext): Promise<PlateauAnalysis> {
    return this.invoke(
      {
        messages: [
          {
            role: 'user',
            content: `Analyse le plateau JSON pour : ${JSON.stringify(context.exerciseHistory ?? [])}`,
          },
        ],
        max_tokens: 600,
        timeout_ms: TIMEOUT_PLATEAU_MS,
      },
      (text) => this.parseJson<PlateauAnalysis>(text),
      context,
      (ctx) => this.fallback.analyzePlateau(ctx)
    );
  }

  async explainAdjustment(context: AIContext): Promise<string> {
    return this.invoke(
      {
        messages: [
          {
            role: 'user',
            content: `Explique cet ajustement pour : ${JSON.stringify(context.rulesEngineRecommendations[0] ?? {})}`,
          },
        ],
        max_tokens: 200,
        timeout_ms: TIMEOUT_SUMMARY_MS,
      },
      (text) => text.trim(),
      context,
      (ctx) => this.fallback.explainAdjustment(ctx)
    );
  }
}
