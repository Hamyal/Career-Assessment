import type { SessionRecord, TraitVector, FinalScoringOutput, ChatMessageRecord } from '@/lib/schemas';
import { supabaseServer } from './client';

const PARTICIPANT_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PARTICIPANT_CODE_LENGTH = 6;

function generateParticipantCode(): string {
  let code = '';
  const bytes = new Uint8Array(PARTICIPANT_CODE_LENGTH);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < PARTICIPANT_CODE_LENGTH; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  for (let i = 0; i < PARTICIPANT_CODE_LENGTH; i++) {
    code += PARTICIPANT_CODE_CHARS[bytes[i] % PARTICIPANT_CODE_CHARS.length];
  }
  return code;
}

export async function createSession(params: {
  user_id: string;
  email: string;
  trait_vector: TraitVector;
  final_score: FinalScoringOutput;
  pdf_url?: string | null;
  chat_messages?: ChatMessageRecord[] | null;
}): Promise<SessionRecord> {
  const supabase = supabaseServer();
  let participantCode = generateParticipantCode();
  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: params.user_id,
        email: params.email,
        trait_vector: params.trait_vector,
        final_score: params.final_score,
        pdf_url: params.pdf_url ?? null,
        participant_code: participantCode,
      })
      .select('id, user_id, email, trait_vector, final_score, pdf_url, participant_code, created_at')
      .single();

    if (error) {
      if (error.code === '23505' && attempt < maxAttempts - 1) {
        participantCode = generateParticipantCode();
        continue;
      }
      throw error;
    }
    return {
      id: data.id,
      user_id: data.user_id,
      email: data.email,
      trait_vector: data.trait_vector as TraitVector,
      final_score: data.final_score as FinalScoringOutput,
      pdf_url: data.pdf_url,
      participant_code: data.participant_code,
      chat_messages: null,
      created_at: data.created_at,
    };
  }
  throw new Error('Could not generate unique participant code');
}

export async function getSessionById(id: string): Promise<SessionRecord | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, user_id, email, trait_vector, final_score, pdf_url, participant_code, created_at')
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
    participant_code: data.participant_code ?? null,
    chat_messages: null,
    created_at: data.created_at,
  };
}

export async function getSessionByParticipantCode(code: string): Promise<SessionRecord | null> {
  if (!code || typeof code !== 'string') return null;
  const normalized = code.trim().toUpperCase().slice(0, 20);
  if (normalized.length < 4) return null;
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, user_id, email, trait_vector, final_score, pdf_url, participant_code, created_at')
    .eq('participant_code', normalized)
    .single();

  if (error || !data) return null;
  return {
    id: data.id,
    user_id: data.user_id,
    email: data.email,
    trait_vector: data.trait_vector as TraitVector,
    final_score: data.final_score as FinalScoringOutput,
    pdf_url: data.pdf_url,
    participant_code: data.participant_code ?? null,
    chat_messages: null,
    created_at: data.created_at,
  };
}

export async function listSessionsByEmail(email: string): Promise<SessionRecord[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('sessions')
    .select('id, user_id, email, trait_vector, final_score, pdf_url, participant_code, created_at')
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
    participant_code: row.participant_code ?? null,
    chat_messages: null,
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
    .select('id, user_id, email, trait_vector, final_score, pdf_url, participant_code, created_at')
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
    participant_code: row.participant_code ?? null,
    chat_messages: null,
    created_at: row.created_at,
  }));
}
