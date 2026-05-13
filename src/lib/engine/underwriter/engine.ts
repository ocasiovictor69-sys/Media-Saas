// src/lib/engine/underwriter/engine.ts (CostGuard for Flow Media)

export type GeneratorName = 'heygen' | 'runway' | 'higgsfield' | 'ffmpeg' | 'raw'
export type MediaTaskType = 'avatar' | 'broll' | 'cinematic' | 'default'

export interface CostEstimate {
  generator: GeneratorName
  taskType: MediaTaskType
  estimatedUsd: number
}

const COST_TABLE: Record<GeneratorName, Record<string, number>> = {
  heygen: { avatar: 2.00, default: 2.00 },
  runway: { broll: 0.50, default: 0.50 },
  higgsfield: { cinematic: 0.30, default: 0.30 },
  ffmpeg: { default: 0.00 },
  raw: { default: 0.00 },
}

export interface UnderwritingInput {
  tasks: Array<{ generator: GeneratorName; taskType: MediaTaskType }>
  budget_usd: number | null
  spent_usd: number
}

export interface UnderwritingResult {
  success: boolean
  allowed: boolean
  total_estimated_usd: number
  remaining_budget_usd: number | null
  breakdown: CostEstimate[]
  reason?: string
}

export class Underwriter {
  static evaluate(input: UnderwritingInput): UnderwritingResult {
    const { tasks, budget_usd, spent_usd } = input
    
    const breakdown = tasks.map(t => this.estimateCost(t.generator, t.taskType))
    const total_estimated = breakdown.reduce((sum, e) => sum + e.estimatedUsd, 0)
    
    if (budget_usd === null) {
      return {
        success: true,
        allowed: true,
        total_estimated_usd: total_estimated,
        remaining_budget_usd: null,
        breakdown
      }
    }

    const remaining = budget_usd - spent_usd
    const allowed = total_estimated <= remaining

    return {
      success: true,
      allowed,
      total_estimated_usd: total_estimated,
      remaining_budget_usd: Math.max(0, remaining - total_estimated),
      breakdown,
      reason: allowed ? undefined : `BUDGET_EXCEEDED: Estimated $${total_estimated.toFixed(2)} exceeds remaining $${remaining.toFixed(2)}`
    }
  }

  private static estimateCost(generator: GeneratorName, taskType: MediaTaskType): CostEstimate {
    const table = COST_TABLE[generator] || {}
    const estimatedUsd = table[taskType] ?? table['default'] ?? 0
    return { generator, taskType, estimatedUsd }
  }
}
