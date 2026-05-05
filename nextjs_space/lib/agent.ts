// Helper for calling the configurable AGENT_API_URL.
// Falls back to the local stub at /api/agent/stub when the env var is unset
// or points to the same stub. Returns a streamable Response.

export function getAgentUrl(): string {
  const url = process.env.AGENT_API_URL?.trim()
  if (url && url.length > 0) return url
  return ''
}

export interface AgentMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AgentRequest {
  messages: AgentMessage[]
  context?: Record<string, any>
  stream?: boolean
}
