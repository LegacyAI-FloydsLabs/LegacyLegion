// Agent runtime loop for LegacyLegion personas.
//
// THE missing piece: the observe -> think -> act -> observe cycle. The persona
// chat route previously did a single model turn and at most one tool call, and
// never fed the tool result back to the model. This module closes that loop:
// call RouteLLM, detect a text-protocol tool call (`-> TOOL_CALL: NAME {json}`),
// dispatch it for REAL via dispatchTool, feed the REAL result back into the
// conversation, and repeat until the model answers with no further tool call or
// the iteration cap is hit.
//
// Real only. RouteLLM is the real Abacus.AI endpoint; dispatchTool performs real
// Prisma / Pinecone / connector work and gates external deliverables behind
// work-order REVIEW status (R4). A missing API key yields a structured
// not-configured result (R3) — never fabricated content.

import { AGENCY_TOOLS } from '@/lib/agency-prompts'
import { dispatchTool, type ToolName, type ToolResult } from '@/lib/agents/dispatcher'
import type { AgentPersona } from '@/lib/agents/registry'
import { recordTurn } from '@/lib/agents/memory'

export type ChatRole = 'system' | 'user' | 'assistant'
export interface ChatMessage {
  role: ChatRole
  content: string
}

const ROUTELLM_URL = 'https://routellm.abacus.ai/v1/chat/completions'
const TOOL_CALL_PREFIX = '→ TOOL_CALL:'

export const DEFAULT_MAX_ITERATIONS = 6
export const DEFAULT_MAX_TOKENS = 1800
export const DEFAULT_PER_CALL_TIMEOUT_MS = 60_000

export type AgentLoopEvent =
  | { type: 'delta'; content: string }
  | { type: 'status'; content: string }
  | { type: 'tool_call'; name: ToolName; args: Record<string, unknown> }
  | { type: 'tool_result'; name: ToolName; result: ToolResult }
  | { type: 'final'; content: string }
  | { type: 'error'; code: string; message: string }

export type AgentLoopStopReason =
  | 'final'
  | 'max_iterations'
  | 'not_configured'
  | 'aborted'
  | 'error'

export interface AgentLoopToolTurn {
  name: ToolName
  args: Record<string, unknown>
  result: ToolResult
}

export interface RunAgentLoopInput {
  persona: AgentPersona
  userId: string
  clientId?: string
  threadId: string
  modelId: string
  modelHint?: string
  apiKey: string
  /** Conversation so far (system + user + any prior turns). Not mutated. */
  messages: ChatMessage[]
  maxIterations?: number
  maxTokens?: number
  perCallTimeoutMs?: number
  signal?: AbortSignal
  /** Persist assistant + tool turns to AgentTurn/Pinecone. Default true. */
  persistTurns?: boolean
  onEvent?: (event: AgentLoopEvent) => void | Promise<void>
}

export interface RunAgentLoopResult {
  finalText: string
  iterations: number
  toolTurns: AgentLoopToolTurn[]
  stopReason: AgentLoopStopReason
}

/** Parse the single-line text tool-call protocol the personas are instructed to emit. */
export function parseToolCall(text: string): { name: ToolName; args: Record<string, unknown> } | null {
  const line = text.split('\n').find((candidate) => candidate.trim().startsWith(TOOL_CALL_PREFIX))
  if (!line) return null
  const match = line.match(/^\s*→ TOOL_CALL:\s*([A-Z_]+)\s*(\{.*\})\s*$/)
  if (!match) return null
  try {
    return { name: match[1] as ToolName, args: JSON.parse(match[2]) }
  } catch {
    return null
  }
}

function knownToolNames(): Set<string> {
  const names = new Set<string>(AGENCY_TOOLS.map((tool) => String(tool.type)))
  names.add('PROSPECT_SEARCH')
  names.add('PROSPECT_PROMOTE')
  return names
}

function allowedToolNames(persona: AgentPersona): Set<string> {
  if (persona.allowedTools === 'all') return knownToolNames()
  return new Set(persona.allowedTools.map((name) => String(name)))
}

/** Remove any `-> TOOL_CALL:` directive lines so the final answer never leaks tool syntax. */
function stripToolCallLines(text: string): string {
  return text
    .split('\n')
    .filter((line) => !line.trim().startsWith(TOOL_CALL_PREFIX))
    .join('\n')
    .trim()
}

interface ModelCallResult {
  ok: boolean
  text: string
  status?: number
}

/**
 * One streaming RouteLLM call. Streams human-facing prose to `emit` line by
 * line, but holds back any `-> TOOL_CALL:` directive line so it never reaches
 * the user. Returns the full accumulated assistant text (including any tool-call
 * line) for parsing + persistence.
 */
async function streamModelCall(args: {
  apiKey: string
  modelId: string
  messages: ChatMessage[]
  maxTokens: number
  timeoutMs: number
  signal?: AbortSignal
  metadata?: Record<string, unknown>
  emit: (event: AgentLoopEvent) => Promise<void>
}): Promise<ModelCallResult> {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  if (args.signal) {
    if (args.signal.aborted) controller.abort()
    else args.signal.addEventListener('abort', onAbort, { once: true })
  }
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs)

  try {
    const upstream = await fetch(ROUTELLM_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.apiKey}` },
      body: JSON.stringify({
        model: args.modelId,
        messages: args.messages,
        stream: true,
        max_tokens: args.maxTokens,
        metadata: args.metadata,
      }),
      signal: controller.signal,
    }).catch(() => null)

    if (!upstream?.ok || !upstream.body) {
      return { ok: false, text: '', status: upstream?.status ?? 0 }
    }

    const reader = upstream.body.getReader()
    const decoder = new TextDecoder()
    let partial = ''
    let fullText = ''
    let pendingLine = ''

    const flushCompletedLine = async (line: string) => {
      if (line.trim().startsWith(TOOL_CALL_PREFIX)) return // suppress directive
      await args.emit({ type: 'delta', content: line + '\n' })
    }

    const handleContent = async (content: string) => {
      fullText += content
      pendingLine += content
      let nl = pendingLine.indexOf('\n')
      while (nl !== -1) {
        const line = pendingLine.slice(0, nl)
        pendingLine = pendingLine.slice(nl + 1)
        await flushCompletedLine(line)
        nl = pendingLine.indexOf('\n')
      }
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      partial += decoder.decode(value, { stream: true })
      const lines = partial.split('\n')
      partial = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (!data || data === '[DONE]') continue
        try {
          const delta = JSON.parse(data)?.choices?.[0]?.delta?.content
          if (typeof delta === 'string' && delta.length > 0) await handleContent(delta)
        } catch {
          // Ignore malformed upstream frames; fullText reflects accumulated text only.
        }
      }
    }

    // Emit the trailing partial line unless it is the held-back tool-call directive.
    if (pendingLine.length > 0 && !pendingLine.trim().startsWith(TOOL_CALL_PREFIX)) {
      await args.emit({ type: 'delta', content: pendingLine })
    }

    return { ok: true, text: fullText }
  } finally {
    clearTimeout(timeout)
    if (args.signal) args.signal.removeEventListener('abort', onAbort)
  }
}

/**
 * Run the agent loop until the model produces a final answer (no tool call) or
 * the iteration cap is reached. Each tool result is fed back to the model so it
 * can observe, reason, chain tools, and synthesize a final answer.
 */
export async function runAgentLoop(input: RunAgentLoopInput): Promise<RunAgentLoopResult> {
  const emit = async (event: AgentLoopEvent) => {
    if (input.onEvent) await input.onEvent(event)
  }
  const maxIterations = Math.max(1, input.maxIterations ?? DEFAULT_MAX_ITERATIONS)
  const maxTokens = input.maxTokens ?? DEFAULT_MAX_TOKENS
  const timeoutMs = input.perCallTimeoutMs ?? DEFAULT_PER_CALL_TIMEOUT_MS
  const persist = input.persistTurns !== false
  const toolTurns: AgentLoopToolTurn[] = []
  const messages: ChatMessage[] = [...input.messages]

  // R3: never fabricate. No key -> structured not-configured.
  if (!input.apiKey || input.apiKey.trim().length === 0) {
    await emit({ type: 'error', code: 'ROUTELLM_NOT_CONFIGURED', message: 'ABACUSAI_API_KEY is not configured.' })
    return { finalText: '', iterations: 0, toolTurns, stopReason: 'not_configured' }
  }

  let lastAssistant = ''
  let iterations = 0

  for (let i = 0; i < maxIterations; i++) {
    iterations = i + 1

    if (input.signal?.aborted) {
      await emit({ type: 'error', code: 'ABORTED', message: 'Request aborted.' })
      return { finalText: stripToolCallLines(lastAssistant), iterations: i, toolTurns, stopReason: 'aborted' }
    }

    const call = await streamModelCall({
      apiKey: input.apiKey,
      modelId: input.modelId,
      messages,
      maxTokens,
      timeoutMs,
      signal: input.signal,
      metadata: { persona: input.persona.id, clientId: input.clientId, hint: input.modelHint, iteration: iterations },
      emit,
    })

    if (!call.ok) {
      await emit({ type: 'error', code: 'GENERATION_FAILED', message: `RouteLLM returned HTTP ${call.status ?? 0}.` })
      return { finalText: stripToolCallLines(lastAssistant), iterations, toolTurns, stopReason: 'error' }
    }

    const assistantText = call.text
    lastAssistant = assistantText
    messages.push({ role: 'assistant', content: assistantText })
    if (persist && assistantText.trim()) {
      await recordTurn({
        userId: input.userId,
        persona: input.persona.id,
        clientId: input.clientId,
        threadId: input.threadId,
        role: 'assistant',
        content: assistantText.trim(),
        modelUsed: input.modelId,
      })
    }

    const toolCall = parseToolCall(assistantText)
    if (!toolCall) {
      const finalText = stripToolCallLines(assistantText)
      await emit({ type: 'final', content: finalText })
      return { finalText, iterations, toolTurns, stopReason: 'final' }
    }

    const name = String(toolCall.name)
    const known = knownToolNames().has(name)
    const allowed = allowedToolNames(input.persona).has(name)
    if (!known || !allowed) {
      const allowList = [...allowedToolNames(input.persona)].join(', ') || 'none'
      const reason = !known
        ? `Unknown tool: ${name}.`
        : `Tool not permitted for this persona: ${name}.`
      await emit({ type: 'status', content: `Blocked tool: ${name}` })
      const feedback = `TOOL_RESULT ${name}: ERROR ${reason} Available tools: ${allowList}. Do not call that tool. Either call a permitted tool or answer the user without any tool.`
      messages.push({ role: 'user', content: feedback })
      if (persist) {
        await recordTurn({
          userId: input.userId,
          persona: input.persona.id,
          clientId: input.clientId,
          threadId: input.threadId,
          role: 'tool',
          content: feedback,
          toolName: name,
          toolCallsJson: { args: toolCall.args, blocked: true, reason: known ? 'not_permitted' : 'unknown_tool' },
        })
      }
      continue
    }

    await emit({ type: 'tool_call', name: toolCall.name, args: toolCall.args })
    const toolMeta = AGENCY_TOOLS.find((tool) => String(tool.type) === name)
    await emit({ type: 'status', content: `Running ${toolMeta?.label ?? name}…` })

    let result: ToolResult
    try {
      result = await dispatchTool(toolCall.name, toolCall.args, {
        userId: input.userId,
        clientId: input.clientId,
        threadId: input.threadId,
      })
    } catch (error) {
      result = {
        ok: false,
        error: { code: 'TOOL_EXCEPTION', message: error instanceof Error ? error.message : 'Tool threw an exception.' },
      }
    }

    toolTurns.push({ name: toolCall.name, args: toolCall.args, result })
    await emit({ type: 'tool_result', name: toolCall.name, result })

    const resultText = result.ok
      ? result.outputMarkdown ?? (result.output ? JSON.stringify(result.output) : 'Tool completed with no textual output.')
      : `ERROR ${result.error?.code ?? 'TOOL_ERROR'}: ${result.error?.message ?? 'Tool failed.'}`

    if (persist) {
      await recordTurn({
        userId: input.userId,
        persona: input.persona.id,
        clientId: input.clientId,
        threadId: input.threadId,
        role: 'tool',
        content: resultText,
        toolName: name,
        toolCallsJson: { args: toolCall.args, result },
      })
    }

    messages.push({
      role: 'user',
      content: `TOOL_RESULT ${name}:\n${resultText}\n\nUse this real result to answer the user. Call another tool only if necessary; otherwise give the final answer with NO TOOL_CALL line.`,
    })
  }

  await emit({ type: 'error', code: 'MAX_ITERATIONS', message: `Reached max iterations (${maxIterations}) without a final answer.` })
  return { finalText: stripToolCallLines(lastAssistant), iterations, toolTurns, stopReason: 'max_iterations' }
}
