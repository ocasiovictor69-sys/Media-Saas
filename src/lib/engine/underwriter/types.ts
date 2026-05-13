// src/lib/engine/underwriter/types.ts

export type PropertyType = 'single_family' | 'multifamily' | 'commercial' | 'mixed_use' | 'industrial'
export type StrategyType = 'flip' | 'rental' | 'brrrr'

export interface SOWItem {
  name: string
  cost: number
  labor: number
  materials: number
  notes?: string
}

export interface BudgetGroup {
  category: string
  items: SOWItem[]
  contingency_pct?: number
}

export interface FinancingTerms {
  loan_type: 'hard_money' | 'conventional' | 'dscr' | 'private' | 'cash'
  loan_amount?: number
  ltv_pct?: number
  interest_rate: number
  interest_only: boolean
  amortization_yrs?: number
  points?: number
  fees?: number
  draw_schedule?: { month: number; amount: number }[]
  balloon_month?: number
}

export interface FixedCosts {
  closing_costs_acq: number
  closing_costs_exit: number
  insurance: number
  utilities: number
  taxes: number
  title_fees?: number
  attorney_fees?: number
  permits?: number
  staging?: number
  commissions_pct: number
}

export interface ComparableSale {
  address: string
  distance_miles: number
  sale_price: number
  sqft: number
  price_per_sqft: number
  beds: number
  baths: number
  sale_date: string
  similarity_score: number
  adjustment_notes?: string
}

export interface UnderwritingInput {
  property_id: string
  property_type: PropertyType
  strategy: StrategyType
  sqft: number
  arv: number
  arv_override?: number
  purchase_price?: number // Path 2 (Performance)
  target_profit?: number   // Path 1 (MAO)
  risk_multiplier?: number // Path 1 (MAO)
  rehab_budget: BudgetGroup[]
  fixed_costs: FixedCosts
  financing: FinancingTerms
  holding_period_months: number
  comps?: ComparableSale[]
  rent_estimate_monthly?: number // For Rental/BRRRR
  operating_expenses_pct?: number // For Rental/BRRRR
}

export interface UnderwritingResult {
  success: boolean
  path: 'mao' | 'performance'
  strategy: StrategyType
  metrics: {
    net_profit: number
    roi_pct: number
    coc_pct: number
    equity_multiple: number
    annualized_return_pct: number
    mao?: number
    dscr?: number
    cap_rate?: number
    noi?: number
    cash_flow_monthly?: number
    break_even_months?: number
    cash_left_in_deal?: number // For BRRRR
    equity_recapture_pct?: number // For BRRRR
  }
  sources_and_uses: {
    loan_amount: number
    equity_required: number
    total_project_cost: number
    rehab_allocation: number
    financing_fees: number
    carrying_costs: number
    fixed_costs_total: number
  }
  warnings: string[]
  audit_trail: {
    original_values: Record<string, any>
    user_overrides: Record<string, any>
    intermediate_calculations: Record<string, any>
  }
}
