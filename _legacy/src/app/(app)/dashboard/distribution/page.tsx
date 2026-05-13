import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Distribution — Flow-Media Pipeline',
  description: 'Manage asset distribution to social media platforms.',
};

interface Distribution {
  id: string;
  platform: string;
  status: string;
  scheduled_at: string | null;
  assets: { file_name: string | null; asset_type: string } | null;
}

export default async function DistributionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: distributions } = (user
    ? await supabase
        .from('distributions')
        .select('*, assets(file_name, asset_type)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
    : { data: [] }) as { data: Distribution[] | null };

  const scheduled = distributions?.filter((d) => d.status === 'scheduled') ?? [];
  const posted    = distributions?.filter((d) => d.status === 'posted') ?? [];
  const pending   = distributions?.filter((d) => d.status === 'pending') ?? [];

  const platformColors: Record<string, string> = {
    youtube:   'bg-red-100 text-red-700',
    instagram: 'bg-pink-100 text-pink-700',
    tiktok:    'bg-slate-100 text-slate-700',
    linkedin:  'bg-blue-100 text-blue-700',
    facebook:  'bg-blue-100 text-blue-800',
    twitter:   'bg-sky-100 text-sky-700',
  };

  const statusColors: Record<string, string> = {
    pending:   'bg-slate-100 text-slate-600',
    scheduled: 'bg-yellow-100 text-yellow-700',
    posted:    'bg-green-100 text-green-700',
    failed:    'bg-red-100 text-red-700',
  };

  const platformList = [
    { name: 'YouTube',   key: 'youtube',   color: 'bg-red-100 text-red-700' },
    { name: 'Instagram', key: 'instagram', color: 'bg-pink-100 text-pink-700' },
    { name: 'TikTok',    key: 'tiktok',    color: 'bg-slate-100 text-slate-600' },
    { name: 'LinkedIn',  key: 'linkedin',  color: 'bg-blue-100 text-blue-700' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black">Distribution</h1>
          <p className="text-slate-600">{distributions?.length ?? 0} total distributions</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Scheduled', value: scheduled.length, color: 'text-yellow-600' },
          { label: 'Posted',    value: posted.length,    color: 'text-green-600' },
          { label: 'Pending',   value: pending.length,   color: 'text-slate-600' },
        ].map((s) => (
          <div key={s.label} className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className={`text-3xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-600">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Connected Platforms</h2>
        </div>
        {platformList.map((platform) => {
          const count = distributions?.filter((d) => d.platform === platform.key).length ?? 0;
          return (
            <div key={platform.name} className="p-6 bg-white flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-black">{platform.name}</h3>
                <p className="text-sm text-slate-500">{count} distributions</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${platform.color}`}>
                {count > 0 ? 'Active' : 'No activity'}
              </span>
            </div>
          );
        })}
      </div>

      {distributions && distributions.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-black">All Distributions</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Asset</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Scheduled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {distributions.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-black">{d.assets?.file_name ?? '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${platformColors[d.platform] ?? 'bg-slate-100 text-slate-600'}`}>
                      {d.platform}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[d.status] ?? 'bg-slate-100 text-slate-600'}`}>
                      {d.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {d.scheduled_at ? new Date(d.scheduled_at).toLocaleString() : '—'}
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
