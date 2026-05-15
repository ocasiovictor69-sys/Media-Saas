import { HTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'
import { clsx, type ClassValue } from 'clsx'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'priority' | 'stage'
  type?: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'priority' | 'stage'
  value?: string
}

export function Badge({ className, variant, type, value, children, ...props }: BadgeProps) {
  const content = value || children

  const colorMap: Record<string, string> = {
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    info: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    neutral: 'bg-white/5 text-slate-400 border-white/10',
    priority: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    stage: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    low: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    medium: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    high: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    NEW: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    QUALIFIED: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    CLOSED_WON: 'bg-green-500/10 text-green-400 border-green-500/20',
    ARCHIVED: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    REVIEW: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  }

  const activeType = variant || type || 'neutral'
  const colorClass = colorMap[activeType] || colorMap.neutral

  return (
    <div
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
        colorClass,
        className
      )}
      {...props}
    >
      {content}
    </div>
  )
}
