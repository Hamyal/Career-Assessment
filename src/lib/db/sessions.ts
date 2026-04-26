import type { SessionRecord, TraitVector, FinalScoringOutput } from '@/lib/schemas';
import { supabaseServer } from './client';

export async function createSession(params: {
  user_id: string;
  email: string;
  trait_vector: TraitVector;
  final_score: FinalScoringOutput;
  pdf_url?: string | null;
}): Promise<SessionRecord> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: params.user_id,
      email: params.email,
      trait_vector: params.trait_vector,
      final_score: params.final_score,
      pdf_url: params.pdf_url ?? null,
    })
    .select('id, user_id, email, trait_vector, final_score, pdf_url, created_at')
    .single();

  if (error) throw error;
  return {
    id: data.id,
    user_id: data.user_id,
    email: data.email,
    trait_vector: data.trait_vector as TraitVector,
    final_score: data.final_score as FinalScoringOutput,
    pdf_url: data.pdf_url,
    created_at: data.created_at,
  };
}

export async function getSessionById(id: string): Promise<SessionRecord | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, user_id, email, trait_vector, final_score, pdf_url, created_at')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    user_id: data.user_id,
    email: data.email,
    trait_vector: data.trait_vector as TraitVector,
    final_score: data.final_score as FinalScoringOutput,
    pdf_url: data.pdf_url,
    created_at: data.created_at,
  };
}

export async function listSessionsByEmail(email: string): Promise<SessionRecord[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, user_id, email, trait_vector, final_score, pdf_url, created_at')
    .eq('email', email.trim().toLowerCase())
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    email: row.email,
    trait_vector: row.trait_vector as TraitVector,
    final_score: row.final_score as FinalScoringOutput,
    pdf_url: row.pdf_url,
    created_at: row.created_at,
  }));
}

export async function updateSessionPdfUrl(sessionId: string, pdfUrl: string): Promise<void> {
  const supabase = supabaseServer();
  const { error } = await supabase
    .from('sessions')
    .update({ pdf_url: pdfUrl })
    .eq('id', sessionId);
  if (error) throw error;
}

const DEFAULT_SESSIONS_LIMIT = 50;
const MAX_SESSIONS_LIMIT = 200;

/** List sessions for admin; optional email filter and pagination. */
export async function listSessions(options?: {
  email?: string;
  limit?: number;
  offset?: number;
}): Promise<SessionRecord[]> {
  const supabase = supabaseServer();
  const limit = Math.min(
    Math.max(1, options?.limit ?? DEFAULT_SESSIONS_LIMIT),
    MAX_SESSIONS_LIMIT
  );
  const offset = Math.max(0, options?.offset ?? 0);
  let q = supabase
    .from('sessions')
    .select('id, user_id, email, trait_vector, final_score, pdf_url, created_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options?.email?.trim()) {
    q = q.eq('email', options.email.trim().toLowerCase());
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    user_id: row.user_id,
    email: row.email,
    trait_vector: row.trait_vector as TraitVector,
    final_score: row.final_score as FinalScoringOutput,
    pdf_url: row.pdf_url,
    created_at: row.created_at,
  }));
}
