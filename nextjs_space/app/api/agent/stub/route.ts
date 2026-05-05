export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'

// Stubbed agent that mimics a streaming OpenAI-style chat completion.
// Will be replaced by AGENT_API_URL once the real cloud agent is online.
// The stub uses the LLM API under the hood to provide useful answers grounded
// in LegacyAI sales context, so prospects see real intelligence even before
// the dedicated agent is plugged in.

const SYSTEM_PROMPT = `You are LegacyLegion's AI lead-qualification agent for LegacyAI.space.

LegacyAI is an AI-first digital marketing firm in Indianapolis competing against Scorpion and Thrive.
Pricing: Launch Pad ($750/mo), Growth Engine ($2,000/mo), Market Dominator ($4,000/mo).
All plans are month-to-month and the client owns every asset built.
Target verticals: HVAC, plumbing, legal, dental, roofing, and other Midwest service businesses.

When talking to a prospect:
- Be warm, specific, and short. 2-4 sentences per turn.
- Ask one focused qualification question at a time.
- Aim to learn: business type, revenue range, current marketing spend, biggest pain point.
- After 4-5 exchanges, suggest a 20-minute discovery call with Ryan.
- Never invent pricing outside the three tiers above.`

export async function POST(req: NextRequest) {
  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) {
    return new Response('Agent unavailable: missing API key', { status: 503 })
  }
  const body = await req.json().catch(() => ({}))
  const incoming = Array.isArray(body?.messages) ? body.messages : []
  const context = body?.context ?? {}
  const stream = body?.stream !== false

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(context && Object.keys(context).length > 0
      ? [{ role: 'system', content: `Conversation context: ${JSON.stringify(context)}` }]
      : []),
    ...incoming,
  ]

  if (!stream) {
    const res = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: 'route-llm', messages, max_tokens: 600 }),
    })
    const data = await res.json().catch(() => ({}))
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const upstream = await fetch('https://routellm.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'route-llm',
      messages,
      stream: true,
      max_tokens: 800,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    return new Response('Upstream agent error', { status: 502 })
  }

  const ts = new TransformStream()
  const writer = ts.writable.getWriter()
  const encoder = new TextEncoder()
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()

  ;(async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        await writer.write(encoder.encode(decoder.decode(value)))
      }
    } catch (e) {
      console.error('agent stub stream error', e)
    } finally {
      try { await writer.close() } catch { /* noop */ }
    }
  })()

  return new Response(ts.readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
