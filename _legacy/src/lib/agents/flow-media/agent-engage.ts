// src/lib/agents/flow-media/agent-engage.ts
import { AgentRunner } from './_base'
import type { AgentInput, AgentResult } from './_types'

export class AgentEngage extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { client_id, payload } = input
    const { platform, post_id, comments } = payload as { platform: string; post_id: string; comments: any[] }

    for (const comment of comments) {
      const sentiment = await this.classifySentiment(comment.text)
      
      if (sentiment === 'positive' || sentiment === 'neutral') {
        const reply = await this.generateReply(comment.text)
        // In a real implementation, post reply via platform API
        console.log(`[AgentEngage] Replying to ${comment.id} on ${platform}: ${reply}`)
      } else {
        console.log(`[AgentEngage] Flagging negative comment ${comment.id} on ${platform}`)
      }
    }

    await this.writeAudit(client_id, 'none', 'agent-engage', 'ENGAGEMENT_CYCLE', { platform, comment_count: comments.length })

    return { success: true, agent: 'agent-engage', action_taken: 'replied_to_comments' }
  }

  private async classifySentiment(text: string): Promise<'positive' | 'neutral' | 'negative'> {
    const prompt = `Classify the sentiment of this social media comment as 'positive', 'neutral', or 'negative'. Return one word only.\n\nComment: "${text}"`
    const raw = await this.askHermes(prompt, 'neutral')
    const result = raw.toLowerCase().trim()
    if (result.includes('positive')) return 'positive'
    if (result.includes('negative')) return 'negative'
    return 'neutral'
  }

  private async generateReply(text: string): Promise<string> {
    const prompt = `Write a short, engaging, and helpful reply to this comment: "${text}". Tone: friendly and professional. Return reply text only.`
    return this.askHermes(prompt, "Thanks for the comment!")
  }
}
