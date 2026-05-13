'use client';

import React from 'react';
import { TimelineEvent } from '@/lib/types';
import { SyncStatusBadge } from './SyncStatusBadge';

interface SyncHistoryProps {
  events: TimelineEvent[];
}

export function SyncHistory({ events }: SyncHistoryProps) {
  const syncEvents = events.filter(e => e.event === 'CRM_SYNC_CONFIRMED' || e.event === 'CRM_SYNC_STARTED');

  if (syncEvents.length === 0) {
    return (
      <div className="p-4 rounded-2xl bg-zinc-50 border border-dashed border-zinc-200 text-center">
        <p className="text-xs text-zinc-500 font-medium">No CRM sync history available for this lead.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {syncEvents.map((event, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-zinc-100 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">
              {new Date(event.created_at || '').toLocaleString()}
            </span>
            <span className="text-xs font-semibold text-zinc-700">
              {event.metadata?.source || 'REsimpli 3.0'} Sync
            </span>
            {event.metadata?.envelope_id && (
              <span className="text-[10px] font-mono text-brand-purple/70">
                ID: {event.metadata.envelope_id}
              </span>
            )}
          </div>
          <SyncStatusBadge status={event.status === 'completed' ? 'ACKED' : 'FAILED'} />
        </div>
      ))}
    </div>
  );
}
