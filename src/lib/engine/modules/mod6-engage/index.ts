import { createClient } from '@/lib/supabase/server'
import type { Services } from '@/lib/services'

export type IncomingComment = {
  client_id:           string
  platform:            string
  platform_post_id:    string
  platform_comment_id: string
  author_handle:       string
  content:             string
}

type Classification = 'positive' | 'question' | 'negative' | 'spam' | 'neutral'

export async function execute(input: IncomingComment, services: Services) {
  const db = await createClient()

  const classification = await classifyComment(input.content, services)

  const { data: comment } = await db.from('comments').insert({
    client_id:           input.client_id,
    platform:            input.platform,
    platform_post_id:    input.platform_post_id,
    platform_comment_id: input.platform_comment_id,
    author_handle:       input.author_handle,
    content:             input.content,
    classification,
    reply_status:        'pending',
  }).select().single()

  if (!comment) return { success: false, error: 'COMMENT_INSERT_FAIL' }

  const { data: rules } = await db
    .from('engagement_rules')
    .select('*')
    .eq('client_id', input.client_id)
    .eq('classification', classification)

  const rule = rules?.[0]
  const action: string = rule?.action || (
    classification === 'negative' ? 'hold_for_review' :
    classification === 'spam'     ? 'ignore' :
    'auto_reply'
  )

  if (action === 'ignore' || action === 'hide') {
    await db.from('comments').update({ reply_status: 'ignored' }).eq('id', comment.id)
    return { success: true, action: 'ignored', comment_id: comment.id }
  }

  const { data: client } = await db
    .from('clients')
    .select('brand_voice, name')
    .eq('id', input.client_id)
    .single()

  const draftReply = await generateReply(
    input.content,
    classification,
    client?.brand_voice as Record<string, string> | null,
    rule?.reply_template as string | null,
    services
  )

  await db.from('comments').update({
    draft_reply:  draftReply,
    reply_status: action === 'auto_reply' ? 'approved' : 'draft',
  }).eq('id', comment.id)

  if (action === 'hold_for_review') {
    return { success: true, action: 'held_for_review', comment_id: comment.id, draft_reply: draftReply }
  }

  return { success: true, action: 'auto_reply_drafted', comment_id: comment.id, draft_reply: draftReply }
}

async function classifyComment(content: string, services: Services): Promise<Classification> {
  if (/spam|follow me|click here|dm for free/i.test(content)) return 'spam'

  if (!services?.ai) {
    if (/great|love|amazing|awesome|beautiful|thank/i.test(content)) return 'positive'
    if (/\?|how|what|when|where|price|cost|available/i.test(content)) return 'question'
    if (/bad|terrible|awful|worst|disappointed|scam/i.test(content)) return 'negative'
    return 'neutral'
  }

  try {
    const prompt = `Classify this comment as exactly one of: positive, question, negative, spam, neutral. Reply with only the single word.\n\nComment: "${content}"`
    const result = (await services.ai.chat(prompt)).trim().toLowerCase() as Classification
    if (['positive', 'question', 'negative', 'spam', 'neutral'].includes(result)) return result
  } catch { /* fall through */ }

  return 'neutral'
}

async function generateReply(
  content: string,
  classification: Classification,
  brandVoice: Record<string, string> | null,
  template: string | null,
  services: Services
): Promise<string> {
  if (template) return template

  const tone = brandVoice?.tone || 'professional and friendly'
  const templates: Record<Classification, string> = {
    positive: 'Thank you so much! We really appreciate your kind words. 🙏',
    question: "Great question! Please send us a DM and we'll be happy to help.",
    negative: "We're sorry to hear about your experience. Please DM us so we can make it right.",
    spam:     '',
    neutral:  'Thank you for reaching out! Feel free to DM us anytime.',
  }

  if (!services?.ai) return templates[classification]

  try {
    const prompt =
      `You manage social media replies for a client. Their tone is: ${tone}. ` +
      `Write a brief, genuine reply (under 100 words) to this ${classification} comment: "${content}". ` +
      `Reply with only the reply text — no quotes, no labels.`
    return await services.ai.chat(prompt)
  } catch {
    return templates[classification]
  }
}
