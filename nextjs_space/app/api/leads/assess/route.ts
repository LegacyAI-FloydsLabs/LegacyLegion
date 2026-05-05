export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { searchSEOIntelligence, summarizeMatches } from '@/lib/pinecone'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ABACUSAI_API_KEY
  if (!apiKey) return new Response('Service unavailable', { status: 503 })

  const body = await req.json().catch(() => ({}))
  const leadId = String(body?.leadId ?? '').trim()
  if (!leadId) return new Response('leadId required', { status: 400 })

  const lead = await prisma.lead.findUnique({ where: { id: leadId } })
  if (!lead) return new Response('Lead not found', { status: 404 })

  // Pull intelligence from Pinecone
  const query = `${lead.industry} marketing SEO ${lead.city ?? 'Indianapolis'} ${lead.state ?? 'IN'} lead generation`
  const matches = await searchSEOIntelligence(query, 5)
  const intelligenceContext = summarizeMatches(matches)

  const systemPrompt = `You are an SEO and lead-generation analyst for LegacyAI, an AI-first marketing firm.

Write a concise, professional, value-first SEO assessment for the prospect below. Use 4-6 short sections with markdown-style bold headings. Be specific to the prospect's industry and city. End with a clear recommendation (Launch Pad $750/mo, Growth Engine $2,000/mo, or Market Dominator $4,000/mo) based on revenue and current spend.

Never invent specific keyword volumes or competitor names — frame as "likely" or "in markets like yours." Keep total under 350 words. Tone: confident peer, not pushy salesperson.`

  const userPrompt = `Prospect snapshot:
- Business: ${lead.businessName}
- Industry: ${lead.industry}
- Location: ${lead.city ?? 'Indianapolis'}, ${lead.state ?? 'IN'}
- Revenue range: ${lead.revenueRange ?? 'unspecified'}
- Current marketing spend: ${lead.currentMarketingSpend ?? 'unspecified'}
- Team size: ${lead.employeeCount ?? 'unspecified'}
- Current provider: ${lead.currentProvider || 'none specified'}
- Pain point: ${lead.biggestPainPoint || 'not specified'}
- Website: ${lead.website || 'not provided'}
- Internal lead score: ${lead.score}/100 (${lead.qualification ?? 'unscored'})

LegacyAI knowledge-base context (top matches):
${intelligenceContext}

Write the assessment now.`

  const upstream = await fetch('https://apps.abacus.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-5.4-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      max_tokens: 900,
    }),
  })

  if (!upstream.ok || !upstream.body) {
    return new Response('Assessment service unavailable', { status: 502 })
  }

  const ts = new TransformStream()
  const writer = ts.writable.getWriter()
  const encoder = new TextEncoder()
  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let partial = ''

  ;(async () => {
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        partial += chunk
        const lines = partial.split('\n')
        partial = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            await writer.write(encoder.encode('data: [DONE]\n\n'))
            continue
          }
          try {
            const parsed = JSON.parse(data)
            const delta = parsed?.choices?.[0]?.delta?.content ?? ''
            if (delta) buffer += delta
          } catch { /* skip */ }
          await writer.write(encoder.encode(line + '\n'))
        }
      }
      // Persist assessment
      if (buffer) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            aiAssessment: buffer,
            aiAssessmentJson: { matches, generatedAt: new Date().toISOString() } as any,
            aiAssessedAt: new Date(),
          },
        })
        await prisma.activity.create({
          data: { leadId: lead.id, type: 'AI_ASSESSMENT', title: 'AI assessment generated', body: buffer.slice(0, 280) },
        })
      }
    } catch (e) {
      console.error('assessment stream error', e)
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
