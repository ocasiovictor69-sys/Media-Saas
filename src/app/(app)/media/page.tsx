import { createClient } from '@/lib/supabase/server'

export default async function MediaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('team_id')
    .eq('id', user?.id ?? '')
    .single()

  const { data: assets } = await supabase
    .from('media_assets')
    .select('*')
    .eq('team_id', profile?.team_id ?? '')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2">Asset Library</h1>
          <p className="text-slate-400">Institutional media repository for video, image, and audio assets.</p>
        </div>
        <button className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20">
          Upload Asset
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {assets?.map((asset) => (
          <div key={asset.id} className="group bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-all">
            <div className="aspect-video bg-black flex items-center justify-center relative">
              <span className="text-4xl">
                {asset.media_type === 'VIDEO' ? '🎬' : '🖼️'}
              </span>
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button className="bg-white text-black px-4 py-2 rounded-lg font-bold text-xs">View Details</button>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm font-bold text-white truncate">{asset.title}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase">{asset.media_type}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white/5 text-indigo-400 border border-white/10">
                  {asset.status}
                </span>
              </div>
            </div>
          </div>
        ))}
        {(!assets || assets.length === 0) && (
          <div className="col-span-full py-24 text-center">
            <p className="text-slate-500 italic">No media assets found in your library.</p>
          </div>
        )}
      </div>
    </div>
  )
}
