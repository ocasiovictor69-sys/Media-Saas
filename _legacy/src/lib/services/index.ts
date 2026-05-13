import { buildRunwayClient } from './runway'
import { buildHiggsfieldClient } from './higgsfield'
import { buildHeyGenClient } from './heygen'
import { buildAIClient } from './ai'

export function buildServices() {
  return {
    runway:     buildRunwayClient(),
    higgsfield: buildHiggsfieldClient(),
    heygen:     buildHeyGenClient(),
    ai:         buildAIClient(),
  }
}

export type Services = ReturnType<typeof buildServices>
