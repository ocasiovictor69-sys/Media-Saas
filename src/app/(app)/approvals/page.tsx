import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Approval Queue — Flow Media Deal Engine',
  description: 'Review and approve agent actions.',
}

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: approvals, error } = await supabase
    .from('approval_queue')
    .select('*, properties(address)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
          Human-in-the-Loop
        </p>
        <h1 className="text-4xl font-extrabold tracking-tight text-white">
          Approval Queue
        </h1>
        <p className="text-slate-400 text-lg mt-2">
          Review and authorize agent actions before they execute.
        </p>
      </div>

      <div className="grid gap-4">
        {approvals?.length === 0 ? (
          <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-12 text-center">
            <div className="text-4xl mb-4">✨</div>
            <h2 className="text-xl font-semibold text-white mb-2">Queue is Empty</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              All agent actions have been processed. Great job!
            </p>
          </div>
        ) : (
          approvals?.map((item) => (
            <div 
              key={item.id}
              className="bg-white/[0.03] border border-white/10 rounded-xl p-6 flex items-center justify-between hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 text-xl">
                  {item.checkpoint_type === 'verification_review' ? '🔍' : item.checkpoint_type === 'outreach_sequence' ? '📧' : '💰'}
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">
                    {item.checkpoint_type.replace(/_/g, ' ').toUpperCase()}
                  </h3>
                  <p className="text-slate-400 text-sm">
                    {item.properties?.address || 'Lead ID: ' + (item.payload.lead_id || 'Unknown')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium transition-all">
                  Details
                </button>
                <button className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-500/20">
                  Approve
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

