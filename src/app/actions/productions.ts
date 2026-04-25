'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createProduction(formData: FormData) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const production = {
    user_id: user.id,
    title: formData.get('title') as string,
    description: formData.get('description') as string,
    script: formData.get('script') as string,
    status: 'scripting',
    platforms: formData.getAll('platforms') as string[],
  };
  
  const { data, error } = await supabase.from('productions').insert(production).select().single();
  if (error) throw error;
  
  revalidatePath('/dashboard/productions');
  return data;
}

export async function updateProduction(id: string, updates: Partial<{
  title: string;
  description: string;
  script: string;
  status: 'scripting' | 'rendering' | 'processing' | 'ready' | 'posted';
  heygen_job_id: string;
  output_url: string;
  platforms: string[];
  scheduled_at: string;
}>) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('productions')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();
    
  if (error) throw error;
  
  revalidatePath('/dashboard/productions');
  return data;
}

export async function deleteProduction(id: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { error } = await supabase
    .from('productions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
    
  if (error) throw error;
  
  revalidatePath('/dashboard/productions');
}
