/**
 * Optional chat enhancement: when OPENAI_API_KEY is set, returns a personalized,
 * conversational phrasing of the assessment question (e.g. for Randy to ask).
 * Keeps the same meaning and data we collect; only the wording is AI-generated.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isOpenAICircuitOpen, recordOpenAIFailure, recordOpenAISuccess } from '@/lib/openai-circuit';
import { checkPersonalizeQuestionRateLimit } from '@/lib/rate-limit';

const openai =
  typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.trim().length > 0
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() })
    : null;

const SYSTEM = `You are Randy, the Career Decoder — a professional, warm AI career coach in a one-on-one chat. Your job is to rephrase ONE assessment question so it sounds natural and conversational, like ChatGPT would ask it.

Rules:
- Output only the rephrased question (1–2 short sentences). No preamble, no "Randy says", no quotes.
- Keep the exact same meaning and what you're asking for (e.g. still asking for email, name, or a choice).
- If you're given the user's first name, use it naturally once (e.g. "Hi [Name], what's the best email to reach you?").
- Sound friendly and human. Vary phrasing slightly (e.g. "What's your full name?" vs "Could you share your full name?").
- Do not add new questions or change the topic. Do not use slang or "Hey". Stay professional and warm.`;

export async function POST(request: Request) {
  const rateLimit = checkPersonalizeQuestionRateLimit(request);
  if (!rateLimit.ok) {
    return NextResponse.json(rateLimit.body, { status: rateLimit.status });
  }
  try {
    const body = await request.json();
    const questionText =
      typeof body?.questionText === 'string' ? body.questionText.trim().slice(0, 500) : '';
    const userName =
      typeof body?.userName === 'string' ? body.userName.trim().slice(0, 80) : '';

    if (!questionText) {
      return NextResponse.json({ prompt: questionText }, { status: 200 });
    }

    if (!openai || isOpenAICircuitOpen()) {
      return NextResponse.json({ prompt: '' }, { status: 200 });
    }

    const userBlurb = userName
      ? `The user's first name is "${userName}". Use their name naturally in the question (e.g. "Hi ${userName}, what's your email?").`
      : 'Do not assume a name; ask without it.';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            userBlurb,
            '',
            'Assessment question to rephrase (keep same meaning, same info we collect):',
            questionText,
            '',
            'Reply with only the rephrased question, nothing else.',
          ].join('\n'),
        },
      ],
      max_tokens: 120,
      temperature: 0.5,
    });

    const prompt = response.choices?.[0]?.message?.content?.trim();
    if (prompt && prompt.length > 0 && prompt.length < 400) {
      recordOpenAISuccess();
      return NextResponse.json({ prompt });
    }
  } catch (e) {
    recordOpenAIFailure();
    console.error('Personalize question API error:', e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ prompt: '' }, { status: 200 });
}
