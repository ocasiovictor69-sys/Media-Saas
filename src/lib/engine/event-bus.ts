import { EventEmitter } from 'events'
import { SocialComment } from '../types'

/**
 * Flow-Media Event Bus
 *
 * Drives the asynchronous media generation factory.
 * Each module emits an event when done, and the orchestrator or 
 * background workers pick it up.
 */

export const MEDIA_EVENTS = {
  PRE_PRODUCTION_COMPLETE:  'PRE_PRODUCTION_COMPLETE',  // D01 -> D02
  GENERATION_SUBMITTED:     'GENERATION_SUBMITTED',     // D02 -> Poller
  GENERATION_COMPLETE:      'GENERATION_COMPLETE',      // Poller -> D03
  DISTRIBUTION_COMPLETE:    'DISTRIBUTION_COMPLETE',    // D03 -> D04
  ENGAGEMENT_DETECTED:      'ENGAGEMENT_DETECTED',      // D04 -> Agento
  PIPELINE_ERROR:           'PIPELINE_ERROR',           // Catch-all
}

class FlowMediaEventBus extends EventEmitter {
  constructor() {
    super()
    this.setMaxListeners(30)
  }

  /**
   * Emit a typed event with payload
   */
  dispatch(event: string, payload: any) {
    console.log(`[EventBus] ${event} | ${payload.leadId || payload.campaignId || 'no-id'}`)
    this.emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
    })
    this.emit('*', { event, ...payload }) // Wildcard for monitoring
  }
}

export const eventBus = new FlowMediaEventBus()
