import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Lead Pipeline — Flow Media Deal Engine',
  description: 'Manage your seller and investor lead pipelines.',
}

export default function LeadsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
          Pipeline Management
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Lead Pipeline
        </h1>
        <p className="text-slate-400 text-lg mt-2">
          View and manage all active seller acquisitions and investor deals.
        </p>
      </div>

      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-12 text-center">
        <div className="text-4xl mb-4">👥</div>
        <h2 className="text-xl font-semibold text-white mb-2">Lead Table Architecture Pending</h2>
        <p className="text-slate-400 max-w-md mx-auto">
          The deterministic lead table is currently being ported from the legacy system. Check back in the next phase.
        </p>
      </div>
    </div>
  )
}

