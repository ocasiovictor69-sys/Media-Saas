'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createProduction(data: {
  title: string;
  platforms: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('productions').insert({
    user_id: user.id,
    title: data.title,
    platforms: data.platforms,
    status: 'draft',
  });

  if (error) return { error: error.message };
  revalidatePath('/dashboard/productions');
  revalidatePath('/dashboard');
  return { success: true };
}

export async function updateProductionStatus(productionId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Verify ownership
  const { data: prod } = await supabase.from('productions').select('user_id').eq('id', productionId).single();
  if (!prod || prod.user_id !== user.id) return { error: 'Access denied' };

  const { error } = await supabase.from('productions').update({ status }).eq('id', productionId);
  if (error) return { error: error.message };
  
  revalidatePath('/dashboard/productions');
  revalidatePath('/dashboard');
  return { success: true };
}
