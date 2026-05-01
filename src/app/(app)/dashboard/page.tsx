import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Dashboard — Flow-Media Pipeline',
  description: 'Autonomous Media Orchestration & Distribution.',
};

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const uid = user?.id ?? '';

  let activeProductions = 0;
  let distributedAssets = 0;
  let totalProductions = 0;

  try {
    const [activeRes, distRes, totalRes] = await Promise.all([
      supabase.from('productions').select('*', { count: 'exact', head: true }).eq('user_id', uid).in('status', ['rendering', 'draft']),
      supabase.from('distributions').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'posted'),
      supabase.from('productions').select('*', { count: 'exact', head: true }).eq('user_id', uid).eq('status', 'completed'),
    ]);
    activeProductions = activeRes.count ?? 0;
    distributedAssets = distRes.count ?? 0;
    totalProductions = totalRes.count ?? 0;
  } catch {
    // Database fallback
  }

  const velocity = totalProductions + activeProductions > 0
    ? Math.round((totalProductions / (totalProductions + activeProductions)) * 100)
    : null;

  const metrics = [
    {
      title: 'Active Productions',
      value: activeProductions.toString(),
      sub: 'rendering or draft',
    },
    {
      title: 'Distributed Assets',
      value: distributedAssets.toLocaleString(),
      sub: 'successfully posted',
    },
    {
      title: 'Pipeline Velocity',
      value: velocity !== null ? `${velocity}%` : '—',
      sub: 'completion rate',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen p-12">
      <div className="flex justify-between items-center mb-12">
        <div>
          <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2 block">Ad Astra per Aspera</span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 text-slate-900">
            Flow-Media <span className="text-gradient">Pipeline</span>
          </h1>
          <p className="text-lg text-slate-500 mt-1 font-medium">Autonomous Media Orchestration & Distribution.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        {metrics.map((metric) => (
          <div key={metric.title} className="glass-card rounded-2xl p-8">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">{metric.title}</h3>
            <p className="text-4xl font-extrabold text-slate-800 mt-3">{metric.value}</p>
            <span className="text-indigo-500 text-sm font-bold block mt-2">{metric.sub}</span>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-10 max-w-xl border-slate-200/60">
        <h2 className="text-2xl font-bold text-slate-800 mb-6">Pipeline Controls</h2>
        <div className="flex flex-col gap-4">
          <Link href="/dashboard/productions" className="flex items-center justify-between group p-4 hover:bg-slate-50/50 rounded-xl transition-all duration-200">
            <span className="text-slate-700 font-semibold group-hover:text-indigo-600 transition-colors">Monitor Active Productions</span>
            <span className="text-indigo-500 transform group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <Link href="/dashboard/library" className="flex items-center justify-between group p-4 hover:bg-slate-50/50 rounded-xl transition-all duration-200">
            <span className="text-slate-700 font-semibold group-hover:text-indigo-600 transition-colors">View Asset Library</span>
            <span className="text-indigo-500 transform group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <Link href="/dashboard/distribution" className="flex items-center justify-between group p-4 hover:bg-slate-50/50 rounded-xl transition-all duration-200">
            <span className="text-slate-700 font-semibold group-hover:text-indigo-600 transition-colors">Distribution Analytics</span>
            <span className="text-indigo-500 transform group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
