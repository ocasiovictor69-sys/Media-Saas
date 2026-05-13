import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Dashboard — Flow Media Deal Engine',
  description: 'Your real estate deal engine. Two pipelines, running 24/7.',
}

const WORKFLOWS = [
  { id: 'A01', label: 'Goliath / PropStream Data Pull', pipeline: 'both' },
  { id: 'A02', label: 'Dedup + Skip Trace', pipeline: 'both' },
  { id: 'A03', label: 'Enrichment (AVM / Comping)', pipeline: 'both' },
  { id: 'A04', label: 'Four-D Scorer', pipeline: '1' },
  { id: 'A05', label: 'Investor Deal Grader', pipeline: '2' },
  { id: 'A06', label: 'Retell AI Voice Call', pipeline: '1' },
  { id: 'A07', label: 'Twilio SMS Follow-Up', pipeline: '1' },
  { id: 'A08', label: 'REsimpli 3.0 Contact Creation', pipeline: 'both' },
  { id: 'A09', label: 'Seller SMS Nurture (28 pts)', pipeline: '1' },
  { id: 'A10', label: 'Seller Email Nurture', pipeline: '1' },
  { id: 'A11', label: 'Re-Engagement Detection', pipeline: '1' },
  { id: 'A12', label: 'Investor Deal Alert', pipeline: '2' },
  { id: 'A13', label: 'Appointment Brief Email', pipeline: '1' },
  { id: 'A14', label: 'Investor Follow-Up Seq.', pipeline: '2' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch lead stats from Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id, full_name, role')
    .eq('id', user?.id ?? '')
    .single()

  const teamId = profile?.team_id

  let p1Count = 0, p2Count = 0, highCount = 0, avgScore = 0

  if (teamId) {
    const { data: leads } = await supabase
      .from('leads')
      .select('pipeline, priority, score')
      .eq('team_id', teamId)

    if (leads) {
      p1Count = leads.filter(l => !l.pipeline || l.pipeline === '1').length
      p2Count = leads.filter(l => l.pipeline === '2').length
      highCount = leads.filter(l => l.priority === 'HIGH').length
      avgScore = leads.length > 0
        ? Math.round(leads.reduce((s, l) => s + (l.score ?? 0), 0) / leads.length)
        : 0
    }
  }

  const displayName = profile?.full_name ?? user?.email?.split('@')[0] ?? 'Agent'

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
            Flow Media Intelligence
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white">
            Deal{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
              Engine
            </span>
          </h1>
          <p className="text-slate-400 text-lg mt-2">
            Welcome back, {displayName}. Two pipelines running 24/7.
          </p>
        </div>
        <a
          href="/leads"
          id="dashboard-view-leads"
          className="hidden md:flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          View Leads
        </a>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Seller Leads (P1)', value: p1Count, color: 'from-indigo-500 to-indigo-600' },
          { label: 'Investor Deals (P2)', value: p2Count, color: 'from-violet-500 to-violet-600' },
          { label: 'High Signal', value: highCount, color: 'from-rose-500 to-rose-600' },
          { label: 'Avg 4-D Score', value: avgScore, color: 'from-emerald-500 to-emerald-600' },
        ].map((card) => (
          <div key={card.label} className="bg-white/[0.03] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3">{card.label}</p>
            <p className={`text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-br ${card.color}`}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Automated Workflows Panel */}
      <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <p className="text-sm font-bold text-slate-300 tracking-wide">
            {WORKFLOWS.length} Automated Workflows Active
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {WORKFLOWS.map((w) => (
            <div
              key={w.id}
              className="flex items-center gap-2 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 hover:bg-white/[0.06] hover:border-white/10 transition-all"
            >
              <span className="text-xs font-mono text-indigo-400 font-semibold">{w.id}</span>
              <span className="text-xs text-slate-400">{w.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { href: '/leads', title: 'Lead Pipeline', desc: 'View and manage all seller & investor leads', icon: '👥' },
          { href: '/team', title: 'Team', desc: 'Manage your team members and roles', icon: '👨‍💼' },
          { href: '/settings', title: 'Settings', desc: 'Configure your account and integrations', icon: '⚙️' },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group bg-white/[0.03] border border-white/5 hover:border-indigo-500/30 rounded-2xl p-6 transition-all hover:bg-white/[0.05]"
          >
            <div className="text-2xl mb-3">{item.icon}</div>
            <h3 className="text-white font-semibold mb-1 group-hover:text-indigo-300 transition-colors">{item.title}</h3>
            <p className="text-slate-500 text-sm">{item.desc}</p>
          </a>
        ))}
      </div>
    </div>
  )
}

