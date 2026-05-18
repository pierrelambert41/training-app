import type { SupabaseClient } from '@supabase/supabase-js';
import type { AIProvider } from './ai-provider';
import { ClaudeProvider } from './claude-provider';
import { FallbackProvider } from './fallback-provider';

export type AIProviderConfig =
  | { mode: 'claude'; supabase: SupabaseClient }
  | { mode: 'fallback' };

/**
 * Factory retournant le provider IA selon la configuration.
 * - mode 'claude' : ClaudeProvider (appels via Edge Function ai-proxy)
 * - mode 'fallback' : FallbackProvider (templates statiques, aucun appel réseau)
 *
 * Par défaut, utiliser 'claude' en production.
 * Utiliser 'fallback' en tests ou quand la feature IA est désactivée.
 */
export function createAIProvider(config: AIProviderConfig): AIProvider {
  if (config.mode === 'fallback') {
    return new FallbackProvider();
  }
  return new ClaudeProvider(config.supabase);
}
