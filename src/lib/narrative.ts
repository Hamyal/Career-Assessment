/**
 * STEP 3 — AI Integration (controlled).
 * Flow: Deterministic scoring → structured JSON → (optional) LLM → narrative text → PDF.
 * AI is used ONLY for final report narrative. AI NEVER decides scoring.
 *
 * Uses OPENAI_API_KEY from .env.local when set: sends full report-generator JSON to OpenAI
 * (primary_type, secondary_type, archetype_scores, stress_profile, lowest_domain, top_motivation_cluster, is_blended).
 * Otherwise: returns placeholder narrative from scores.
 */

import OpenAI from 'openai';
import type { FinalScoringOutput } from '@/lib/schemas';
import { buildPlaceholderNarrative } from '@/lib/pdf/generate-report';
import { isOpenAICircuitOpen, recordOpenAIFailure, recordOpenAISuccess } from '@/lib/openai-circuit';

/** Full scoring output as JSON for the AI report prompt (required report-generator shape). */
function toReportGeneratorJson(score: FinalScoringOutput): string {
  return JSON.stringify(
    {
      primary_type: score.primary_type,
      secondary_type: score.secondary_type,
      archetype_scores: score.archetype_scores,
      stress_profile: score.stress_profile,
      lowest_domain: score.lowest_domain,
      top_motivation_cluster: score.top_motivation_cluster ?? '',
      is_blended: score.is_blended,
      ...(score.career_alignment_score != null && { career_alignment_score: score.career_alignment_score }),
    },
    null,
    2
  );
}

const openai =
  typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.trim().length > 0
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() })
    : null;

const NARRATIVE_SYSTEM = `You are a career coach writing a short, personalized summary for a PowerPrint™ Career Assessment report.
Write 2–3 concise paragraphs based only on the structured scoring data you receive.
Tone: professional, encouraging, neutral. No therapy or diagnostic language. No slang.
Do not make up facts. Use only the archetype names and scores provided.`;

/**
 * Returns narrative text for the report.
 * If OPENAI_API_KEY is set, calls OpenAI with the full report-generator JSON and returns the model's summary.
 * Otherwise, or on any error, returns the placeholder narrative.
 */
const NARRATIVE_TIMEOUT_MS = 12_000;

export async function getNarrativeForReport(score: FinalScoringOutput): Promise<string> {
  if (!openai || isOpenAICircuitOpen()) {
    return buildPlaceholderNarrative(score);
  }

  const placeholder = buildPlaceholderNarrative(score);

  const aiNarrative = (async (): Promise<string | null> => {
    try {
      const reportJson = toReportGeneratorJson(score);
      const response = await openai.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: NARRATIVE_SYSTEM },
            {
              role: 'user',
              content: `Generate the report summary narrative for this assessment result (use primary_type, secondary_type, archetype_scores, stress_profile, lowest_domain, and is_blended):\n${reportJson}`,
            },
          ],
          max_tokens: 320,
          temperature: 0.6,
        },
        { timeout: NARRATIVE_TIMEOUT_MS }
      );

      const text = response.choices?.[0]?.message?.content?.trim();
      if (text && text.length > 0) {
        recordOpenAISuccess();
        return text;
      }
    } catch (e) {
      recordOpenAIFailure();
      console.error('OpenAI narrative error (using placeholder):', e instanceof Error ? e.message : e);
    }
    return null;
  })();

  return Promise.race([
    aiNarrative.then((t) => (t && t.length > 0 ? t : placeholder)),
    new Promise<string>((resolve) => setTimeout(() => resolve(placeholder), NARRATIVE_TIMEOUT_MS)),
  ]);
}
