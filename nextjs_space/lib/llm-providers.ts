/**
 * LLM provider registry — maps user-facing provider names to RouteLLM model IDs.
 *
 * RouteLLM (Abacus.AI) exposes an OpenAI-compatible surface. Setting the `model`
 * field to a concrete model ID pins the request to that provider; `route-llm`
 * lets the router decide based on the `hint` metadata.
 */

export type LLMProviderId = 'auto' | 'openai' | 'anthropic' | 'google'

export interface LLMProvider {
  id: LLMProviderId
  label: string
  /** model string sent to RouteLLM; 'route-llm' means auto-routed */
  modelId: string
  /** short tag shown in mobile header */
  tag: string
}

export const LLM_PROVIDERS: LLMProvider[] = [
  {
    id: 'auto',
    label: 'Auto (RouteLLM)',
    modelId: 'route-llm',
    tag: 'AUTO',
  },
  {
    id: 'openai',
    label: 'OpenAI GPT-4o',
    modelId: 'gpt-4o',
    tag: 'GPT-4o',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Claude Sonnet',
    modelId: 'claude-sonnet-4-20250514',
    tag: 'CLAUDE',
  },
  {
    id: 'google',
    label: 'Google Gemini 2.5 Flash',
    modelId: 'gemini-2.5-flash-preview-05-20',
    tag: 'GEMINI',
  },
]

export function getLLMProvider(id: LLMProviderId): LLMProvider {
  return LLM_PROVIDERS.find((p) => p.id === id) ?? LLM_PROVIDERS[0]
}
