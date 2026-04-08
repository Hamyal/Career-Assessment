/**
 * Returns one personalized message: brief acknowledgment of the user's answer
 * plus the next question in a single natural reply (conversational flow).
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isOpenAICircuitOpen, recordOpenAIFailure, recordOpenAISuccess } from '@/lib/openai-circuit';
import { checkChatTransitionRateLimit } from '@/lib/rate-limit';

const openai =
  typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.trim().length > 0
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() })
    : null;

const SYSTEM = `You are Randy, the Career Decoder — a professional, warm AI career coach in a one-on-one chat.

The user just answered a question. Your job is to reply in ONE continuous message that:
1. Briefly acknowledges what they said in a personalized way (one short sentence — reference their answer, not generic "Thanks").
2. Then naturally ask the next assessment question in the same message.

Rules:
- Sound like a single conversational reply (e.g. "That makes sense, Hami. When you start to feel overwhelmed, what's your usual go-to response?").
- Use their first name when you have it (e.g. "Hami").
- Keep the same meaning and intent of the next question — we still need that information. Do not skip or change the question topic.
- One paragraph only. No bullet points, no "Next:" label. Output only the combined message, nothing else.`;

export async function POST(request: Request) {
  const rateLimit = checkChatTransitionRateLimit(request);
  if (!rateLimit.ok) {
    return NextResponse.json(rateLimit.body, { status: rateLimit.status });
  }
  try {
    const body = await request.json();
    const userAnswer =
      typeof body?.userAnswer === 'string' ? body.userAnswer.trim().slice(0, 600) : '';
    const nextQuestionText =
      typeof body?.nextQuestionText === 'string' ? body.nextQuestionText.trim().slice(0, 500) : '';
    const userName =
      typeof body?.userName === 'string' ? body.userName.trim().slice(0, 80) : '';

    if (!nextQuestionText) {
      return NextResponse.json({ message: '' }, { status: 200 });
    }

    if (!openai || isOpenAICircuitOpen()) {
      return NextResponse.json({ message: '' }, { status: 200 });
    }

    const userBlurb = userName
      ? `The user's first name is ${userName}. Use it naturally (e.g. "Hami").`
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            userBlurb,
            `User's answer (acknowledge this in your reply): ${userAnswer || '(no answer)'}`,
            '',
            'Next question to ask in the same message (keep the same meaning):',
            nextQuestionText,
            '',
            'Reply with one continuous message: acknowledgment + next question. No labels, one paragraph.',
          ].filter(Boolean).join('\n'),
        },
      ],
      max_tokens: 180,
      temperature: 0.5,
    });

    const message = response.choices?.[0]?.message?.content?.trim();
    if (message && message.length > 0 && message.length < 600) {
      recordOpenAISuccess();
      return NextResponse.json({ message });
    }
  } catch (e) {
    recordOpenAIFailure();
    console.error('Chat next message API error:', e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ message: '' }, { status: 200 });
}
