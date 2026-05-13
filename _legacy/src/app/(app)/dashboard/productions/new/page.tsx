'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function NewProductionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const platforms = form.getAll('platforms') as string[];
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setLoading(false); return; }
    const { error: insertError } = await supabase.from('productions').insert({
      user_id: user.id,
      title: form.get('title') as string,
      description: form.get('description') as string || null,
      platforms: platforms.length > 0 ? platforms : null,
      status: 'draft',
    });
    if (insertError) { setError(insertError.message); setLoading(false); return; }
    router.push('/dashboard/productions');
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/productions" className="text-slate-400 hover:text-black">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-black">New Production</h1>
      </div>

      <form onSubmit={handleSubmit} className="divide-y divide-slate-200 rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 bg-white space-y-4">
          <h2 className="text-lg font-semibold text-black mb-1">Production Details</h2>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Title</label>
            <input name="title" type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30" placeholder="Episode 1 — Introduction" />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Description</label>
            <textarea name="description" rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30 resize-none" placeholder="What is this production about?" />
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-2">Target Platforms</label>
            <div className="flex flex-wrap gap-2">
              {['YouTube', 'Instagram', 'TikTok', 'LinkedIn', 'Twitter/X'].map((platform) => (
                <label key={platform} className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                  <input type="checkbox" name="platforms" value={platform.toLowerCase()} className="accent-brand-purple" />
                  <span className="text-sm text-slate-700">{platform}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Status</label>
            <select name="status" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/30">
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-100">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="p-6 bg-white flex justify-end gap-3">
          <Link href="/dashboard/productions" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </Link>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-brand-purple text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60">
            {loading ? 'Saving...' : 'Create Production'}
          </button>
        </div>
      </form>
    </div>
  );
}
