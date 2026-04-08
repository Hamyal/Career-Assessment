/**
 * Career Assessment — Production Data Schemas
 * AI = Language layer only. Scoring = Deterministic. Backend = Brain.
 *
 * STEP 1 — System Architecture: A. User Response, B. Trait Vector, C. Final Scoring (+ LLM payload).
 */

// =============================================================================
// A. USER RESPONSE SCHEMA — { user_id?, email, responses[], resume_file_url?, photo_file_url? }
// =============================================================================

export type ArchetypeId = 'decoder' | 'signal' | 'bridge' | 'heartbeat';
export type StressTagId = string; // e.g. 'time_pressure' | 'ambiguity' | ...

export interface UserResponseItem {
  question_id: number;
  selected_options: string[]; // e.g. ["A", "C"] — max 2 for multi-select
  custom_text?: string;
}

export interface UserResponsePayload {
  user_id?: string;
  email: string;
  responses: UserResponseItem[];
  resume_file_url?: string;
  photo_file_url?: string;
  /** Optional chat transcript for persistent memory (array of { role, content }) */
  chat_messages?: ChatMessageRecord[];
}

// =============================================================================
// B. TRAIT VECTOR SCHEMA (deterministic scoring output — no AI)
// Spec: { [traitKey: string]: number } e.g. analytical, creative, leadership, practical.
// This product uses archetypes: decoder, signal, bridge, heartbeat.
// =============================================================================

export interface TraitVector {
  decoder: number;
  signal: number;
  bridge: number;
  heartbeat: number;
}

export interface StressProfile {
  [tag: string]: number; // tag id -> count
}

// =============================================================================
// C. FINAL SCORING OUTPUT — Required input for Report Generator (PDF + AI narrative)
// Scoring engine must output this structured JSON. It feeds the PDF generator
// and (via toLlmScoringPayload or full score) the AI report narrative.
//
// Report generator input shape:
// {
//   "primary_type": "decoder" | "signal" | "bridge" | "heartbeat",
//   "secondary_type": "...",
//   "archetype_scores": { "decoder": n, "signal": n, "bridge": n, "heartbeat": n },
//   "stress_profile": { "tag_id": count, ... },   // object, not string
//   "lowest_domain": "...",                      // growth edge
//   "top_motivation_cluster": "..." | undefined,
//   "is_blended": boolean,
//   "career_alignment_score": number | undefined
// }
// =============================================================================

export interface FinalScoringOutput {
  primary_type: ArchetypeId;
  secondary_type: ArchetypeId;
  is_blended: boolean; // true when top two within 3 points
  archetype_scores: TraitVector;
  stress_profile: StressProfile; // { [tag: string]: number }
  lowest_domain: ArchetypeId; // growth edge
  top_motivation_cluster?: string;
  career_alignment_score?: number; // 0–100
}

/**
 * LLM-facing payload: structured JSON only (no free-form).
 * Spec: { top_traits, secondary_traits, career_alignment_score?, raw_trait_scores }
 */
export interface LlmScoringPayload {
  top_traits: string[];
  secondary_traits: string[];
  career_alignment_score?: number;
  raw_trait_scores: Record<string, number>;
}

// =============================================================================
// D. QUESTION & OPTION SCHEMA (for 54 questions, multi-select rules)
// =============================================================================

export interface QuestionOption {
  id: string; // "A" | "B" | "C" | "D"
  label: string;
  archetype: ArchetypeId;
  stress_tag?: StressTagId;
}

export interface Question {
  id: number;
  text: string;
  options: QuestionOption[];
  multi_select: boolean; // if true, max 2 selections
  required: boolean;
}

// =============================================================================
// E. SESSION / DB SHAPE (aligns with Sessions table)
// =============================================================================

export interface ChatMessageRecord {
  role: 'assistant' | 'user';
  content: string;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  email: string;
  trait_vector: TraitVector;
  final_score: FinalScoringOutput;
  pdf_url: string | null;
  participant_code: string | null;
  chat_messages: ChatMessageRecord[] | null;
  created_at: string; // ISO
}

export interface ResponseRecord {
  session_id: string;
  question_id: number;
  selected_options: string[];
  custom_text: string | null;
}

export interface UserRecord {
  id: string;
  email: string;
  created_at: string;
}
