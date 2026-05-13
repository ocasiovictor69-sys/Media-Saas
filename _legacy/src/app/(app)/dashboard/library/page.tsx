import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Asset Library — Flow-Media Pipeline',
  description: 'View and download generated media assets.',
};

interface Asset {
  id: string;
  file_name: string | null;
  asset_type: string;
  file_size_mb: number | null;
  file_url: string | null;
  productions: { title: string } | null;
}

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: assets } = (user
    ? await supabase
        .from('assets')
        .select('*, productions(title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }) as { data: Asset[] | null };

  const counts = {
    video:     assets?.filter((a) => a.asset_type === 'video').length ?? 0,
    thumbnail: assets?.filter((a) => a.asset_type === 'thumbnail').length ?? 0,
    caption:   assets?.filter((a) => a.asset_type === 'caption').length ?? 0,
  };

  const typeColors: Record<string, string> = {
    video:     'bg-purple-100 text-purple-700',
    thumbnail: 'bg-blue-100 text-blue-700',
    caption:   'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black">Asset Library</h1>
          <p className="text-slate-600">{assets?.length ?? 0} assets across your productions</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Videos', value: counts.video },
          { label: 'Thumbnails', value: counts.thumbnail },
          { label: 'Captions', value: counts.caption },
        ].map((cat) => (
          <div key={cat.label} className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-3xl font-bold text-brand-purple mb-1">{cat.value}</div>
            <div className="text-sm text-slate-600">{cat.label}</div>
          </div>
        ))}
      </div>

      {!assets || assets.length === 0 ? (
        <div className="p-12 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <p className="text-slate-500 mb-2">No assets yet</p>
          <p className="text-sm text-slate-400">Assets are generated from your productions</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">File Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Production</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-black">{a.file_name ?? '—'}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{a.productions?.title ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${typeColors[a.asset_type] ?? 'bg-slate-100 text-slate-600'}`}>
                      {a.asset_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {a.file_size_mb ? `${a.file_size_mb} MB` : '—'}
                  </td>
                  <td className="px-6 py-4">
                    {a.file_url && (
                      <a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-purple hover:underline font-medium">
                        Download
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
