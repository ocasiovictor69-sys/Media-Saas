// src/lib/agents/flow-media/index.ts
import { AgentInput, AgentResult } from './_types'
import { AgentBrief } from './agent-brief'
import { AgentHiggsfield } from './agent-higgsfield'
import { AgentHeyGen } from './agent-heygen'
import { AgentRunway } from './agent-runway'
import { AgentAssembly } from './agent-assembly'
import { AgentAudio } from './agent-audio'
import { AgentMotionGraphics } from './agent-motion-graphics'
import { AgentExport } from './agent-export'
import { AgentDistribute } from './agent-distribute'
import { AgentEngage } from './agent-engage'

export const AGENT_REGISTRY: Record<string, any> = {
  'agent-brief': AgentBrief,
  'agent-higgsfield': AgentHiggsfield,
  'agent-heygen': AgentHeyGen,
  'agent-runway': AgentRunway,
  'agent-assembly': AgentAssembly,
  'agent-audio': AgentAudio,
  'agent-motion-graphics': AgentMotionGraphics,
  'agent-export': AgentExport,
  'agent-distribute': AgentDistribute,
  'agent-engage': AgentEngage,
}

export async function runAgent(agentName: string, input: AgentInput): Promise<AgentResult> {
  const AgentClass = AGENT_REGISTRY[agentName]
  if (!AgentClass) {
    return { success: false, agent: agentName, action_taken: 'none', error: `Agent ${agentName} not found in registry` }
  }

  try {
    const agent = new AgentClass()
    return await agent.run(input)
  } catch (err) {
    console.error(`[AgentRegistry] ${agentName} failed:`, err)
    return { success: false, agent: agentName, action_taken: 'none', error: (err as Error).message }
  }
}
