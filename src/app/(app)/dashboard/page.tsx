import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Dashboard — Flow Media AI Production',
  description: 'Institutional AI media production and distribution core.',
}

const WORKFLOWS = [
  { id: 'M01', label: 'AI Script Generation (Anthropic)', pipeline: 'both' },
  { id: 'M02', label: 'Dynamic Video Rendering', pipeline: 'both' },
  { id: 'M03', label: 'Automated Social Distribution', pipeline: 'both' },
  { id: 'M04', label: 'Asset Storage (AWS S3)', pipeline: 'both' },
  { id: 'M05', label: 'Caption & Subtitle Generation', pipeline: 'both' },
  { id: 'M06', label: 'Thumbnail AI Generation', pipeline: 'both' },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id, full_name, role')
    .eq('id', user?.id ?? '')
    .single()

  const teamId = profile?.team_id

  let assetCount = 0, jobCount = 0, distCount = 0, renderHealth = 0

  if (teamId) {
    const [{ count: aCount }, { count: jCount }, { count: dCount }] = await Promise.all([
      supabase.from('media_assets').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
      supabase.from('render_jobs').select('*', { count: 'exact', head: true }).eq('team_id', teamId),
      supabase.from('social_distributions').select('*', { count: 'exact', head: true }).eq('team_id', teamId)
    ])

    assetCount = aCount || 0
    jobCount = jCount || 0
    distCount = dCount || 0
    renderHealth = 100 // System status
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
            Splicer{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
              Engine
            </span>
          </h1>
          <p className="text-slate-400 text-lg mt-2">
            Welcome back, {displayName}. Two pipelines running 24/7.
          </p>
        </div>
        <a
          href="/media"
          id="dashboard-view-assets"
          className="hidden md:flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 text-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          View Assets
        </a>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Media Assets', value: assetCount, color: 'from-indigo-500 to-indigo-600' },
          { label: 'Rendering Jobs', value: jobCount, color: 'from-violet-500 to-violet-600' },
          { label: 'Scheduled Posts', value: distCount, color: 'from-rose-500 to-rose-600' },
          { label: 'System Health', value: `${renderHealth}%`, color: 'from-emerald-500 to-emerald-600' },
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
            {WORKFLOWS.length} Media Production Modules Active
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
          { href: '/media', title: 'Asset Library', desc: 'Manage your video, image, and audio assets', icon: '📁' },
          { href: '/scripts', title: 'Script Studio', desc: 'AI-driven script generation and editing', icon: '✍️' },
          { href: '/render', title: 'Render Queue', desc: 'Monitor active video rendering and upscaling', icon: '🎞️' },
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

