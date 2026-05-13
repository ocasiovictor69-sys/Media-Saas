import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Analytics — Flow-Media Pipeline',
  description: 'Performance metrics and recent distribution activity.',
};

interface RecentDistribution {
  id: string;
  platform: string;
  status: string;
  posted_at: string | null;
  caption: string | null;
}

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const uid = user?.id ?? '';

  let totalProductions = 0;
  let totalAssets = 0;
  let postedCount = 0;
  let pendingCount = 0;
  let recentDistributions: RecentDistribution[] = [];

  try {
    const [prodRes, assetRes, postedRes, pendingRes, recentRes] = await Promise.all([
      supabase.from('productions').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('assets').select('*', { count: 'exact', head: true }).eq('user_id', uid),
      supabase.from('distributions').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'posted'),
      supabase.from('distributions').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'scheduled'),
      supabase.from('distributions').select('id, platform, status, posted_at, caption').eq('user_id', uid).order('posted_at', { ascending: false }).limit(10),
    ]);

    totalProductions = prodRes.count ?? 0;
    totalAssets      = assetRes.count ?? 0;
    postedCount      = postedRes.count ?? 0;
    pendingCount     = pendingRes.count ?? 0;
    recentDistributions = recentRes.data as RecentDistribution[] ?? [];
  } catch {
    // DB fallback
  }

  const stats = [
    { label: 'Total Productions', value: totalProductions.toString() },
    { label: 'Total Assets',      value: totalAssets.toString() },
    { label: 'Posts Published',   value: postedCount.toString() },
    { label: 'Scheduled',         value: pendingCount.toString() },
  ];

  const platformColors: Record<string, string> = {
    youtube:   'bg-red-100 text-red-700',
    instagram: 'bg-pink-100 text-pink-700',
    tiktok:    'bg-slate-100 text-slate-700',
    linkedin:  'bg-blue-100 text-blue-700',
    facebook:  'bg-blue-100 text-blue-800',
    twitter:   'bg-sky-100 text-sky-700',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-black">Analytics</h1>
        <p className="text-slate-600">Performance metrics across all platforms</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div className="text-3xl font-bold text-brand-purple mb-1">{stat.value}</div>
            <div className="text-sm text-slate-600">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-black">Recent Activity</h2>
        </div>
        {recentDistributions.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-500 mb-1">No distribution activity yet</p>
            <p className="text-sm text-slate-400">Publish content to your connected platforms to start tracking</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentDistributions.map((d) => (
              <div key={d.id} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${platformColors[d.platform] ?? 'bg-slate-100 text-slate-600'}`}>
                    {d.platform}
                  </span>
                  <p className="text-sm text-slate-600 mt-1 truncate max-w-md">{d.caption || 'No caption'}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${d.status === 'posted' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {d.status}
                  </span>
                  {d.posted_at && (
                    <p className="text-xs text-slate-400 mt-1">{new Date(d.posted_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
