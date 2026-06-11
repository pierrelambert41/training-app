/**
 * Format de messages natif Claude API avec support du prompt caching.
 * Utilisé par les builders de prompts (domain/prompts/) avant envoi via ClaudeProvider.
 * Cf. docs/ai-strategy.md §5 (prompt caching) et §6 (portabilité).
 */

export type CacheControl = {
  type: 'ephemeral';
};

export type TextContentBlock = {
  type: 'text';
  text: string;
  cache_control?: CacheControl;
};

export type ClaudeMessage = {
  role: 'user' | 'assistant';
  content: TextContentBlock[];
};

/**
 * Structure complète envoyée au LLM : messages + system optionnel.
 * Les builders de prompts retournent ce type.
 *
 * system accepte aussi un tableau de blocs (TA-147) : les prompts de
 * génération placent le catalogue en première position avec
 * cache_control: ephemeral (prompt caching Anthropic, ADR-025).
 */
export type ClaudeMessages = {
  system?: string | TextContentBlock[];
  messages: ClaudeMessage[];
};
