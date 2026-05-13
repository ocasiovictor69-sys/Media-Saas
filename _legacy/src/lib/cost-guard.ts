/**
 * Cost Guard — Pre-flight Budget Enforcement
 *
 * Prevents uncontrolled AI generation spend.
 * Every generator call must pass through the cost guard before firing.
 *
 * Fixes:
 *   - [CG-1] No budget cap on generation calls
 *   - [CG-2] No per-campaign spend tracking
 *   - [CG-3] No pre-flight cost estimate
 */

import { GeneratorName, MediaTaskType, CostEstimate } from './types'

// ── Cost estimates (conservative upper bounds per generation) ─────────────────
// These are hard-sealed estimates based on published pricing.
// Update when provider pricing changes.

const COST_TABLE: Record<GeneratorName, Record<string, number>> = {
  heygen: {
    avatar: 2.00,       // ~1min avatar video
    default: 2.00,
  },
  runway: {
    broll: 0.50,        // 10-second clip @ $0.05/sec
    default: 0.50,
  },
  higgsfield: {
    cinematic: 0.30,    // per generation
    default: 0.30,
  },
  ffmpeg: {
    default: 0.00,      // local processing — no API cost
  },
  raw: {
    default: 0.00,
  },
}

/**
 * Estimate cost for a single generation task.
 */
export function estimateCost(generator: GeneratorName, taskType: MediaTaskType): CostEstimate {
  const table = COST_TABLE[generator] || {}
  const estimatedUsd = table[taskType] ?? table['default'] ?? 0
  return { generator, taskType, estimatedUsd }
}

/**
 * Check if a campaign has sufficient budget remaining.
 *
 * @param budgetUsd    — campaign budget cap (null = no cap)
 * @param spentUsd     — already spent
 * @param nextCostUsd  — cost of next generation
 * @returns { allowed, remaining, reason }
 */
export function checkBudget(
  budgetUsd:   number | null,
  spentUsd:    number,
  nextCostUsd: number,
): { allowed: boolean; remaining: number | null; reason?: string } {
  if (budgetUsd === null) {
    // No cap — allowed, but log the spend
    return { allowed: true, remaining: null }
  }

  const remaining = budgetUsd - spentUsd

  if (nextCostUsd > remaining) {
    return {
      allowed:   false,
      remaining: +remaining.toFixed(4),
      reason:    `BUDGET_EXCEEDED: next call costs $${nextCostUsd.toFixed(4)}, only $${remaining.toFixed(4)} remaining of $${budgetUsd} budget`,
    }
  }

  return { allowed: true, remaining: +remaining.toFixed(4) }
}

/**
 * Pre-flight check: estimate + budget gate for an entire task list.
 * Returns the full breakdown and whether the campaign can proceed.
 */
export function preflightCostCheck(
  tasks:     Array<{ generator: GeneratorName; taskType: MediaTaskType }>,
  budgetUsd: number | null,
  spentUsd:  number,
): {
  allowed:      boolean
  totalEstimated: number
  breakdown:    CostEstimate[]
  reason?:      string
} {
  const breakdown = tasks.map(t => estimateCost(t.generator, t.taskType))
  const totalEstimated = breakdown.reduce((sum, e) => sum + e.estimatedUsd, 0)

  const gate = checkBudget(budgetUsd, spentUsd, totalEstimated)

  return {
    allowed:       gate.allowed,
    totalEstimated: +totalEstimated.toFixed(4),
    breakdown,
    reason:        gate.reason,
  }
}
