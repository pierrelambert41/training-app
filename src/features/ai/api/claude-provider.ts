import type { SupabaseClient } from '@supabase/supabase-js';
import type { Exercise } from '@/types';
import type { AIContext } from '../types/ai-context';
import type {
  BlockSummary,
  PlateauAnalysis,
  Recommendation,
  SessionSummary,
} from '../types/ai-responses';
import type {
  AIIntermediateOutput,
  BlockRegenerationContext,
  ProgramGenerationContext,
  ValidationContext,
  ValidationError,
} from '../types/ai-generation';
import { AIProviderError, AIValidationExhaustedError } from '../types/ai-generation';
import type { ClaudeMessages } from '../types/claude-messages';
import { buildGenerateProgramPrompt } from '../domain/prompts/generate-program-prompt';
import { buildRegenerateBlockPrompt } from '../domain/prompts/regenerate-block-prompt';
import { validateAIGeneratedProgram } from '../domain/validate-ai-program';
import type { AIProvider } from './ai-provider';
import { FallbackProvider } from './fallback-provider';

const TIMEOUT_SUMMARY_MS = 30_000;
const TIMEOUT_PLATEAU_MS = 45_000;
// Génération de programme : output long (~1-3k tokens), timeout large (≥ 15s requis).
const TIMEOUT_GENERATION_MS = 60_000;
const MAX_TOKENS_GENERATION = 4_000;

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

  // -------------------------------------------------------------------------
  // Génération de programme (ADR-028, TA-142)
  // -------------------------------------------------------------------------

  /**
   * Génération initiale de programme. Retourne le schéma JSON intermédiaire
   * validé (TA-143) — le caller applique transformAIOutputToProgram ensuite.
   *
   * Contrairement aux méthodes d'interprétation : AUCUN fallback silencieux.
   * - Erreur transport (timeout, réseau, 429, 5xx) → AIProviderError typée.
   * - Double échec de validation (génération + 1 retry avec feedback) →
   *   AIValidationExhaustedError. Le caller bascule sur FallbackProvider (TA-145)
   *   ou laisse l'UX TA-146 proposer une action explicite.
   */
  async generateProgram(
    context: ProgramGenerationContext,
    catalogSnapshot: Exercise[],
    validationCtx: ValidationContext
  ): Promise<AIIntermediateOutput> {
    const prompt = buildGenerateProgramPrompt(context, catalogSnapshot);
    return this.generateValidated(prompt, validationCtx, 'generateProgram');
  }

  /**
   * Régénération du bloc suivant (ADR-028, TA-144). Même schéma intermédiaire,
   * même validateur, même cycle retry que generateProgram. La continuité
   * 60-80% est une consigne du prompt (cf. buildRegenerateBlockPrompt).
   *
   * Jamais enqueué dans la queue TA-141 : le retry est piloté par
   * l'utilisateur (TA-146). Erreurs : AIProviderError / AIValidationExhaustedError.
   */
  async regenerateBlock(
    context: BlockRegenerationContext,
    catalogSnapshot: Exercise[],
    validationCtx: ValidationContext
  ): Promise<AIIntermediateOutput> {
    const prompt = buildRegenerateBlockPrompt(context, catalogSnapshot);
    return this.generateValidated(prompt, validationCtx, 'regenerateBlock');
  }

  /**
   * Cycle génération → validation → 1 retry avec feedback → validation.
   * Partagé entre generateProgram et regenerateBlock (TA-144).
   */
  protected async generateValidated(
    prompt: ClaudeMessages,
    validationCtx: ValidationContext,
    label: string
  ): Promise<AIIntermediateOutput> {
    const first = await this.invokeGeneration(prompt);
    const firstResult = validateAIGeneratedProgram(first, validationCtx);
    if (firstResult.valid) return first;

    this.logValidationErrors(label, 'first_attempt', firstResult.errors);

    const retryPrompt: ClaudeMessages = {
      system: prompt.system,
      messages: [
        ...prompt.messages,
        { role: 'assistant', content: [{ type: 'text', text: JSON.stringify(first) }] },
        { role: 'user', content: [{ type: 'text', text: firstResult.feedback ?? 'Programme rejeté — corrige et renvoie le JSON.' }] },
      ],
    };

    const second = await this.invokeGeneration(retryPrompt);
    const secondResult = validateAIGeneratedProgram(second, validationCtx);
    if (secondResult.valid) return second;

    this.logValidationErrors(label, 'retry', secondResult.errors);
    throw new AIValidationExhaustedError(secondResult.errors);
  }

  private logValidationErrors(label: string, attempt: string, errors: ValidationError[]): void {
    // Loguées pour amélioration des prompts (TA-143).
    console.warn(
      `[claude-provider] ${label} validation failed (${attempt}):`,
      errors.map((e) => `${e.code}@${e.field}`).join(', ')
    );
  }

  private async invokeGeneration(prompt: ClaudeMessages): Promise<AIIntermediateOutput> {
    let data: AIProxyResponse | null;
    let error: unknown;

    try {
      ({ data, error } = await this.supabase.functions.invoke<AIProxyResponse>('ai-proxy', {
        body: {
          system: prompt.system,
          messages: prompt.messages,
          max_tokens: MAX_TOKENS_GENERATION,
          timeout_ms: TIMEOUT_GENERATION_MS,
        },
      }));
    } catch (e) {
      throw new AIProviderError('network', `ai-proxy unreachable: ${String(e)}`);
    }

    if (error) {
      throw this.classifyTransportError(error);
    }

    const text = data?.content?.[0]?.text;
    if (!text) {
      throw new AIProviderError('invalid_response', 'ai-proxy returned an empty response');
    }

    try {
      return this.parseJson<AIIntermediateOutput>(text);
    } catch {
      throw new AIProviderError('invalid_response', 'No parseable JSON in generation response');
    }
  }

  private classifyTransportError(error: unknown): AIProviderError {
    const err = error as { name?: string; message?: string; context?: { status?: number } };
    const status = err.context?.status;

    if (status === 429) {
      return new AIProviderError('rate_limited', 'Claude rate limit (429) via ai-proxy');
    }
    if (err.name === 'FunctionsFetchError') {
      return new AIProviderError('network', err.message ?? 'Network error calling ai-proxy');
    }
    if (typeof err.message === 'string' && /timeout|timed out/i.test(err.message)) {
      return new AIProviderError('timeout', err.message);
    }
    return new AIProviderError(
      'http_error',
      `ai-proxy error${status !== undefined ? ` (HTTP ${status})` : ''}: ${err.message ?? 'unknown'}`
    );
  }
}
