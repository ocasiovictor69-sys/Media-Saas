// src/lib/agents/agent-verify.ts
import { AgentRunner } from './base'
import { skipTrace } from './services/skiptrace'
import { lookupPhone } from './services/twilio-lookup'
import { verifyEmail } from './services/kickbox'
import { validateAddress } from './services/smarty'
import type { AgentInput, AgentResult, VerificationResult } from './types'

export class AgentVerify extends AgentRunner {
  async run(input: AgentInput): Promise<AgentResult> {
    const { lead_id, team_id } = input
    if (!lead_id) {
      return { success: false, agent: 'AgentVerify', action_taken: 'none', error: 'MISSING_LEAD_ID' }
    }

    // 1. Fetch Lead
    const { data: lead, error: fetchError } = await this.db
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()

    if (fetchError || !lead) {
      return { success: false, agent: 'AgentVerify', action_taken: 'none', error: 'LEAD_NOT_FOUND' }
    }

    // 2. Set status to verifying
    await this.db.from('leads').update({ stage: 'ACTIVE' }).eq('id', lead_id)

    // 3. Skip Trace
    let skipData: any
    try {
      skipData = await skipTrace({ 
        property_address: lead.property_address, 
        owner_name: lead.seller_name 
      })
      await this.logAudit(team_id, 'SKIP_TRACE_SUCCESS', { skipData }, lead_id)
    } catch (err) {
      return { 
        success: false, 
        agent: 'AgentVerify', 
        action_taken: 'skip_trace_failed', 
        error: `SKIP_TRACE_FAIL: ${(err as Error).message}` 
      }
    }

    // 4. Verification Logic
    const verification: VerificationResult = {
      phone_valid: false,
      email_valid: false,
      address_valid: false,
      identity_confidence: 0,
      identity_flags: [],
      recommendation: 'review',
    }

    // Phone Lookup
    if (skipData.phones?.[0]) {
      try {
        const ph = await lookupPhone(skipData.phones[0])
        verification.phone_valid = ph.valid && ph.type !== 'voip' && ph.type !== 'prepaid'
        verification.phone_carrier = ph.carrier
        verification.phone_type = ph.type
        if (!verification.phone_valid) verification.identity_flags.push(`Phone flagged: ${ph.type}`)
      } catch (err) {
        verification.identity_flags.push(`Phone lookup failed: ${(err as Error).message}`)
      }
    }

    // Email Verify
    if (skipData.emails?.[0]) {
      try {
        const em = await verifyEmail(skipData.emails[0])
        verification.email_valid = em.valid && !em.disposable
        verification.email_reason = em.reason
        if (!verification.email_valid) verification.identity_flags.push(`Email invalid: ${em.reason}`)
      } catch (err) {
        verification.identity_flags.push(`Email verify failed: ${(err as Error).message}`)
      }
    }

    // Address Validation
    if (skipData.mailing_address) {
      try {
        const addr = await validateAddress(skipData.mailing_address)
        verification.address_valid = addr.valid
        verification.address_dpv = addr.dpv_code
        if (!verification.address_valid) verification.identity_flags.push('Address not USPS-validated')
      } catch (err) {
        verification.identity_flags.push(`Address verify failed: ${(err as Error).message}`)
      }
    }

    // 5. AI Coherence Check
    const coherence = await this.checkCoherence(lead, skipData, verification)
    verification.identity_confidence = coherence.confidence
    verification.recommendation = coherence.recommendation
    verification.identity_flags.push(...coherence.flags)

    // 6. Create Approval Queue Item
    const { error: queueError } = await this.db.from('approval_queue').insert({
      agent_id: lead.owner_id || 'system', // Fallback to system if no owner
      checkpoint_type: 'verification_review',
      status: 'pending',
      payload: {
        lead_id,
        verification,
        skip_trace: skipData,
      }
    })

    if (queueError) {
      console.error('[AgentVerify] Failed to insert into approval_queue:', queueError)
    }

    await this.logAudit(team_id, 'VERIFICATION_COMPLETE', { verification }, lead_id)

    const notification = this.buildNotification(
      `Verification complete for ${lead.seller_name}. Confidence: ${verification.identity_confidence}%`,
      'action_required',
      `/dashboard/leads/${lead_id}`
    )
    await this.notify(notification)

    return { 
      success: true, 
      agent: 'AgentVerify', 
      action_taken: 'verification_complete', 
      notification,
      payload: { verification }
    }
  }

  private async checkCoherence(lead: any, skipData: any, verification: VerificationResult) {
    const prompt = `
      Analyze identity coherence for a real estate lead.
      Lead Name: ${lead.seller_name}
      Lead Address: ${lead.property_address}
      
      Skip Trace Name: ${skipData.owner_name}
      Found Phones: ${JSON.stringify(skipData.phones)}
      Found Emails: ${JSON.stringify(skipData.emails)}
      
      Verifications:
      Phone Valid: ${verification.phone_valid}
      Email Valid: ${verification.email_valid}
      Address Valid: ${verification.address_valid}
      
      Does the lead data match the owner record? 
      Return JSON: { "confidence": number, "flags": string[], "recommendation": "approve"|"review"|"reject" }
    `
    const fallback = JSON.stringify({
      confidence: 50,
      flags: ['AI_FALLBACK'],
      recommendation: 'review'
    })

    const response = await this.chat(prompt, fallback)
    try {
      return JSON.parse(response)
    } catch {
      return JSON.parse(fallback)
    }
  }
}
