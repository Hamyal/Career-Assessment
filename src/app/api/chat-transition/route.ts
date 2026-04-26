/**
 * Optional chat enhancement: when OPENAI_API_KEY is set, returns a short
 * contextual transition phrase for the conversation (e.g. after a user answer).
 * Used to make the Career Decoder chat feel more natural.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isOpenAICircuitOpen, recordOpenAIFailure, recordOpenAISuccess } from '@/lib/openai-circuit';
import { checkChatTransitionRateLimit } from '@/lib/rate-limit';

const openai =
  typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.trim().length > 0
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() })
    : null;

/** Keep a single upbeat line (model sometimes returns two sentences). */
function normalizeOneLineTransition(raw: string): string {
  let t = raw.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  const first = t.match(/^[^.!?]+[.!?]?/);
  t = first ? first[0].trim() : t.split('\n')[0]?.trim() ?? t;
  if (t.length > 240) t = `${t.slice(0, 237)}…`;
  return t;
}

const STYLE_HINTS = [
  'Professional career-coach tone: warm, credible, never slangy or flippant.',
  'Reference one concrete fact from their answer (name, year, program) in polished language.',
  'Include a forward-looking nudge — momentum, clarity, or next step — in the same sentence.',
  'Vary structure: sometimes lead with acknowledgment, sometimes with their milestone.',
  'Sound like a trusted advisor at work: concise, motivating, appropriate for a client-facing report.',
  'Avoid empty praise ("great job!"); prefer substance tied to what they actually said.',
] as const;

function varietyHintForStep(stepIndex: number, answerSnippet: string): string {
  const n = STYLE_HINTS.length;
  const i = Math.abs(stepIndex * 31 + answerSnippet.length * 17) % n;
  const j = (i + 1 + (answerSnippet.charCodeAt(0) ?? 0)) % n;
  return `${STYLE_HINTS[i]} ${STYLE_HINTS[j]}`;
}

const SYSTEM = `You are TheoBot, a professional AI Career Coach delivering a PowerPrint™ assessment for biaPathways.
After EACH user answer, reply with EXACTLY ONE sentence (max ~36 words).

Voice:
- Professional, warm, and motivating — like a seasoned career advisor, not a casual chat app.
- Acknowledge their answer with substance: reference a specific detail (their name, a year, a path they mentioned) when relevant.
- End with quiet forward momentum (e.g. clarity for what’s next, confidence in the process, or how this shapes their profile) — not empty hype.

Uniqueness:
- Do not repeat the same opening formula every time; vary your phrasing while staying professional.
- Follow the "Style focus" in the user message.

Do NOT ask a question. Do NOT repeat or preview the next assessment question. No bullet points or emojis.`;

export async function POST(request: Request) {
  const rateLimit = checkChatTransitionRateLimit(request);
  if (!rateLimit.ok) {
    return NextResponse.json(rateLimit.body, { status: rateLimit.status });
  }
  try {
    const body = await request.json();
    const questionText =
      typeof body?.questionText === 'string' ? body.questionText.trim().slice(0, 500) : '';
    const userAnswer =
      typeof body?.userAnswer === 'string' ? body.userAnswer.trim().slice(0, 500) : '';
    const firstName = typeof body?.firstName === 'string' ? body.firstName.trim().slice(0, 80) : '';
    const stepIndex =
      typeof body?.stepIndex === 'number' && Number.isFinite(body.stepIndex) && body.stepIndex >= 0
        ? Math.floor(body.stepIndex)
        : 0;
    const questionId =
      typeof body?.questionId === 'number' && Number.isFinite(body.questionId) ? Math.floor(body.questionId) : null;

    if (!questionText) {
      return NextResponse.json({ transition: null }, { status: 200 });
    }

    if (!openai || isOpenAICircuitOpen()) {
      return NextResponse.json({ transition: null }, { status: 200 });
    }

    const userBlurb = firstName
      ? `The participant's name is ${firstName}; use it professionally when natural (not every sentence must begin with it). `
      : '';
    const raw = (userAnswer ?? '').trim();
    const answerLabel = raw && raw !== '—' ? raw : '(skipped)';
    const hasAnswer = answerLabel !== '(skipped)';
    const varietyHint = varietyHintForStep(stepIndex + (questionId ?? 0), answerLabel);
    const response = await openai.chat.completions.create(
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM },
          {
            role: 'user',
            content: `${userBlurb}Turn: step ${stepIndex}${questionId != null ? ` · question_id ${questionId}` : ''}.
Style focus: ${varietyHint}

Question they answered:\n"${questionText}"

Their answer:\n"${answerLabel}"

${hasAnswer ? 'Write ONE professional, motivating sentence that acknowledges their answer and implies how it strengthens their career profile or next steps.' : 'They skipped this item — ONE respectful, low-pressure professional sentence that keeps momentum without guilt.'}

Output only that sentence, nothing else.`,
          },
        ],
        max_tokens: 120,
        temperature: 0.72,
        frequency_penalty: 0.4,
        presence_penalty: 0.3,
      },
      { timeout: 8000 }
    );

    const rawTransition = response.choices?.[0]?.message?.content?.trim();
    const transition = rawTransition ? normalizeOneLineTransition(rawTransition) : '';
    if (transition && transition.length > 0 && transition.length < 1200) {
      recordOpenAISuccess();
      return NextResponse.json({ transition });
    }
  } catch (e) {
    recordOpenAIFailure();
    console.error('Chat transition API error:', e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ transition: null }, { status: 200 });
}
