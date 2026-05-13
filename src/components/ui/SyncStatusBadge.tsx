'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ACKED' | 'FAILED';

interface SyncStatusBadgeProps {
  status: SyncStatus;
  className?: string;
}

export function SyncStatusBadge({ status, className }: SyncStatusBadgeProps) {
  const config = {
    IDLE: {
      label: 'IDLE',
      dotColor: 'bg-zinc-300',
      textColor: 'text-zinc-500',
      bgColor: 'bg-zinc-100/50',
    },
    SYNCING: {
      label: 'SYNCING',
      dotColor: 'bg-brand-purple animate-pulse',
      textColor: 'text-brand-purple',
      bgColor: 'bg-brand-purple/10',
    },
    ACKED: {
      label: 'SYNCED',
      dotColor: 'bg-emerald-500',
      textColor: 'text-emerald-700',
      bgColor: 'bg-emerald-100',
    },
    FAILED: {
      label: 'ERROR',
      dotColor: 'bg-rose-500',
      textColor: 'text-rose-700',
      bgColor: 'bg-rose-100',
    },
  };

  const { label, dotColor, textColor, bgColor } = config[status];

  return (
    <div
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-tight border border-white/20 transition-all duration-300',
        bgColor,
        textColor,
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full mr-1.5', dotColor)}></span>
      {label}
    </div>
  );
}
