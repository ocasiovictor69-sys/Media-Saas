import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const metadata = {
  title: 'Productions — Flow-Media Pipeline',
  description: 'Manage and monitor your media productions.',
};

interface Production {
  id: string;
  title: string;
  status: string;
  platforms: string[];
  created_at: string;
}

export default async function ProductionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: productions } = (user
    ? await supabase.from('productions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    : { data: [] }) as { data: Production[] | null };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black">Productions</h1>
          <p className="text-slate-600">{productions?.length ?? 0} productions in pipeline</p>
        </div>
        <Link
          href="/dashboard/productions/new"
          className="px-4 py-2 bg-brand-purple text-white rounded-lg hover:opacity-90 font-medium"
        >
          + New Production
        </Link>
      </div>

      {!productions || productions.length === 0 ? (
        <div className="p-12 bg-slate-50 rounded-xl border border-slate-200 text-center">
          <p className="text-slate-500 mb-4">No productions yet</p>
          <Link href="/dashboard/productions/new" className="text-brand-purple font-medium hover:underline">
            Create your first production
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
          {productions.map((p) => (
            <div key={p.id} className="p-4 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div>
                <h3 className="font-medium text-black">{p.title}</h3>
                <p className="text-sm text-slate-500">{p.platforms?.join(', ') || 'No platforms set'}</p>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                p.status === 'published' ? 'bg-green-100 text-green-700' :
                p.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
