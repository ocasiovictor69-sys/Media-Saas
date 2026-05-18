import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Lead Pipeline — Flow Media Deal Engine',
  description: 'Manage your AI media production deals and client pipelines.',
}

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user?.id ?? '')
    .single()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .eq('team_id', profile?.team_id ?? '')
    .order('created_at', { ascending: false })

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'NEW':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
      case 'ACTIVE':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
      case 'QUALIFIED':
        return 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
      case 'CLOSED_WON':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-bold'
      case 'ARCHIVED':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
      default:
        return 'bg-slate-500/5 text-slate-400 border border-slate-500/10'
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'HIGH':
        return 'text-rose-400 font-extrabold bg-rose-500/5 border border-rose-500/10 px-2 py-0.5 rounded text-[10px]'
      case 'MEDIUM':
        return 'text-amber-400 font-bold bg-amber-500/5 border border-amber-500/10 px-2 py-0.5 rounded text-[10px]'
      case 'LOW':
        return 'text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded text-[10px]'
      default:
        return 'text-slate-400 bg-slate-500/5 border border-slate-500/10 px-2 py-0.5 rounded text-[10px]'
    }
  }

  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'VIDEO':
        return '🎬 VIDEO'
      case 'AUDIO':
        return '🎵 AUDIO'
      case 'IMAGE':
        return '🖼️ IMAGE'
      case 'SCRIPT':
        return '📝 SCRIPT'
      default:
        return '📦 ASSET'
    }
  }

  const getPlatformLabel = (platform: string) => {
    switch (platform) {
      case 'YOUTUBE':
        return '📺 YouTube'
      case 'TIKTOK':
        return '📱 TikTok'
      case 'INSTAGRAM':
        return '📸 Instagram'
      case 'TWITTER':
        return '🐦 X (Twitter)'
      case 'MULTI':
        return '🌐 Multi-Platform'
      default:
        return '🌐 Digital'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-400 font-bold'
    if (score >= 50) return 'text-amber-400 font-bold'
    return 'text-rose-400'
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">
            Pipeline Management
          </p>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">
            Lead Pipeline
          </h1>
          <p className="text-slate-400 text-lg mt-2">
            View and manage all active client video acquisitions and digital media projects.
          </p>
        </div>
        <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
          Create New Lead
        </button>
      </div>

      <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden backdrop-filter blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.01]">
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Client & Project</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Format & Platform</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Pipeline Stage</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Priority</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Score</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Received</th>
                <th className="p-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads?.map((lead) => (
                <tr key={lead.id} className="border-b border-white/5 hover:bg-white/[0.01] transition-colors group">
                  <td className="p-4">
                    <div className="font-bold text-white text-base">{lead.project_title}</div>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span className="text-slate-300 font-semibold">{lead.client_name}</span>
                      {lead.client_email && (
                        <>
                          <span>•</span>
                          <span className="text-slate-400">{lead.client_email}</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="text-xs font-bold text-white">{getMediaTypeIcon(lead.media_type)}</div>
                    <div className="text-[11px] text-indigo-400 mt-1 font-semibold">{getPlatformLabel(lead.platform)}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStageBadge(lead.stage)}`}>
                      {lead.stage}
                    </span>
                  </td>
                  <td className="p-4">
                    {getPriorityBadge(lead.priority)}
                  </td>
                  <td className="p-4 text-center">
                    <div className={`text-sm ${getScoreColor(lead.score)}`}>{lead.score}</div>
                    <div className="w-12 h-1 bg-white/10 rounded-full mx-auto mt-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${lead.score >= 75 ? 'bg-emerald-500' : lead.score >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${lead.score}%` }}
                      ></div>
                    </div>
                  </td>
                  <td className="p-4 text-xs text-slate-500 font-semibold">
                    {new Date(lead.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="p-4 text-right">
                    <button className="text-indigo-400 hover:text-indigo-300 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-white/5 transition-all">
                      Configure Production
                    </button>
                  </td>
                </tr>
              ))}
              {(!leads || leads.length === 0) && (
                <tr>
                  <td colSpan={7} className="py-24 text-center">
                    <div className="text-3xl mb-3">📂</div>
                    <p className="text-slate-500 italic text-sm">No media project leads found in this pipeline.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

