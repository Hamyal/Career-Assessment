import type { ResponseRecord } from '@/lib/schemas';
import { supabaseServer } from './client';

export async function insertResponses(
  sessionId: string,
  responses: { question_id: number; selected_options: string[]; custom_text?: string | null }[]
): Promise<void> {
  const supabase = supabaseServer();
  const rows = responses.map((r) => ({
    session_id: sessionId,
    question_id: r.question_id,
    selected_options: r.selected_options,
    custom_text: r.custom_text ?? null,
  }));

  const { error } = await supabase.from('responses').insert(rows);
  if (error) throw error;
}

export async function getResponsesBySessionId(sessionId: string): Promise<ResponseRecord[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('responses')
    .select('session_id, question_id, selected_options, custom_text')
    .eq('session_id', sessionId);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    session_id: row.session_id,
    question_id: row.question_id,
    selected_options: row.selected_options ?? [],
    custom_text: row.custom_text,
  }));
}
