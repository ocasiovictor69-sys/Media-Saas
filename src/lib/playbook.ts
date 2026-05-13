// src/lib/playbook.ts

export type PlaybookStep = {
  step: number
  action: string
  label: string
  wait_days: number
  terminal?: boolean
  repeat?: boolean
}

export const PLAYBOOK: Record<string, PlaybookStep[]> = {
  "HIGH": [
    {
      "step": 1,
      "action": "outreach/generate",
      "label": "Direct Mail / Generate Scripts",
      "wait_days": 7
    },
    {
      "step": 2,
      "action": "outreach/sms",
      "label": "SMS Follow-up",
      "wait_days": 3
    },
    {
      "step": 3,
      "action": "outreach/call",
      "label": "Cold Call",
      "wait_days": 2
    },
    {
      "step": 4,
      "action": "outreach/loom",
      "label": "Loom Equity Report",
      "wait_days": 3
    }
  ],
  "MEDIUM": [
    {
      "step": 1,
      "action": "outreach/sms",
      "label": "Nurture SMS",
      "wait_days": 7
    },
    {
      "step": 2,
      "action": "outreach/loom",
      "label": "Loom Equity Report",
      "wait_days": 7
    }
  ]
}
