/**
 * Convert FinalScoringOutput to LLM-facing JSON (STEP 1 — C. Final Scoring Output).
 * LLM should ONLY receive this structured shape.
 */

import type { FinalScoringOutput, LlmScoringPayload } from './types';

export function toLlmScoringPayload(score: FinalScoringOutput): LlmScoringPayload {
  const raw_trait_scores: Record<string, number> = {
    decoder: score.archetype_scores.decoder ?? 0,
    signal: score.archetype_scores.signal ?? 0,
    bridge: score.archetype_scores.bridge ?? 0,
    heartbeat: score.archetype_scores.heartbeat ?? 0,
  };
  return {
    top_traits: [score.primary_type],
    secondary_traits: [score.secondary_type],
    ...(score.career_alignment_score != null && { career_alignment_score: score.career_alignment_score }),
    raw_trait_scores,
  };
}
