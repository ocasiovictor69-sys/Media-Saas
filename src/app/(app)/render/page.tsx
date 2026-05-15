import { createClient } from '@/lib/supabase/server'

export default async function RenderPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user?.id ?? '')
    .single()

  const { data: jobs } = await supabase
    .from('render_jobs')
    .select('*, media_assets(title)')
    .eq('team_id', profile?.team_id ?? '')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Render Queue</h1>
        <p className="text-slate-400">Real-time monitoring of AI video rendering and upscaling jobs.</p>
      </div>

      <div className="bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Job Type</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Asset</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Status</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Progress</th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {jobs?.map((job) => (
              <tr key={job.id} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-white/5 text-indigo-400 border border-white/10 uppercase">
                    {job.job_type}
                  </span>
                </td>
                <td className="px-6 py-4 text-white font-medium">
                  {/* @ts-ignore */}
                  {job.media_assets?.title ?? 'Untitled Asset'}
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                    job.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400' : 
                    job.status === 'FAILED' ? 'bg-rose-500/10 text-rose-400' :
                    'bg-amber-500/10 text-amber-400 animate-pulse'
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500" 
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">{job.progress}%</span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-xs">
                  {new Date(job.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {(!jobs || jobs.length === 0) && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                  No active render jobs in the queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
