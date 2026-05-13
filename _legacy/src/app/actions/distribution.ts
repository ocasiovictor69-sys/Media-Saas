'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function scheduleDistribution(data: {
  asset_id: string;
  platform: string;
  caption?: string;
  scheduled_at: string; // ISO string
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Verify asset ownership
  const { data: asset } = await supabase.from('assets').select('user_id').eq('id', data.asset_id).single();
  if (!asset || asset.user_id !== user.id) return { error: 'Asset not found or access denied' };

  const { error } = await supabase.from('distributions').insert({
    user_id: user.id,
    asset_id: data.asset_id,
    platform: data.platform,
    caption: data.caption || null,
    scheduled_at: data.scheduled_at,
    status: 'scheduled',
  });

  if (error) return { error: error.message };
  revalidatePath('/dashboard/distribution');
  revalidatePath('/dashboard/analytics');
  return { success: true };
}
