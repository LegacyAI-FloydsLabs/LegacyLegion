import { AgentSettings } from './_components/agent-settings'

export const dynamic = 'force-dynamic'

export default function AgentSettingsPage() {
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Agent Settings</h1>
        <p className="text-muted-foreground mt-1">Configure the AI agent endpoint and copy the embeddable chat widget.</p>
      </div>
      <AgentSettings configured={Boolean(process.env.AGENT_API_URL && /^https?:\/\//i.test(process.env.AGENT_API_URL ?? ''))} agentUrl={process.env.AGENT_API_URL ?? ''} />
    </div>
  )
}
