import type { UserRecord } from '@/lib/schemas';
import { supabaseServer } from './client';

export async function getOrCreateUserByEmail(email: string): Promise<UserRecord> {
  const supabase = supabaseServer();
  const normalized = email.trim().toLowerCase();

  const { data: existing, error: selectError } = await supabase
    .from('users')
    .select('id, email, created_at')
    .eq('email', normalized)
    .maybeSingle();

  if (selectError) throw selectError;

  if (existing) {
    return {
      id: existing.id,
      email: existing.email,
      created_at: existing.created_at,
    };
  }

  const { data: inserted, error } = await supabase
    .from('users')
    .insert({ email: normalized })
    .select('id, email, created_at')
    .single();

  if (error) throw error;
  return {
    id: inserted.id,
    email: inserted.email,
    created_at: inserted.created_at,
  };
}
