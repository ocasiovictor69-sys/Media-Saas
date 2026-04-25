import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black">Dashboard</h1>
          <p className="text-slate-600">Overview of your media pipeline</p>
        </div>
        <Link href="/dashboard/productions/new" className="px-4 py-2 bg-brand-purple text-white rounded-lg hover:opacity-90">
          + New Production
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-3xl font-bold text-brand-purple">0</div>
          <div className="text-sm text-slate-600">Productions</div>
        </div>
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-3xl font-bold text-brand-purple">0</div>
          <div className="text-sm text-slate-600">Assets</div>
        </div>
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-3xl font-bold text-brand-purple">0</div>
          <div className="text-sm text-slate-600">Scheduled Posts</div>
        </div>
        <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
          <div className="text-3xl font-bold text-brand-purple">0</div>
          <div className="text-sm text-slate-600">Total Views</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="p-6 bg-slate-50 rounded-xl border border-slate-200">
        <h2 className="text-lg font-semibold text-black mb-4">Recent Activity</h2>
        <p className="text-slate-600">No recent activity</p>
      </div>
    </div>
  );
}
