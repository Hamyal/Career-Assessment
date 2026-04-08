/**
 * Optional chat enhancement: when OPENAI_API_KEY is set, returns a short
 * contextual transition phrase for the conversation (e.g. after a user answer).
 * Used to make the Randy, the Career Decoder chat feel more natural.
 */

import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { isOpenAICircuitOpen, recordOpenAIFailure, recordOpenAISuccess } from '@/lib/openai-circuit';
import { checkChatTransitionRateLimit } from '@/lib/rate-limit';

const openai =
  typeof process.env.OPENAI_API_KEY === 'string' && process.env.OPENAI_API_KEY.trim().length > 0
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() })
    : null;

const SYSTEM = `You are Randy, the Career Decoder — a professional, warm AI career coach. After the user answers a question, reply with ONE short acknowledgment only (one sentence, under 12 words). You are NOT asking the next question — the app will show the next question separately. So your job is only to acknowledge their answer briefly. Examples: "Thanks, Najeeb." "Got it." "Noted, thanks." "Thanks for sharing." When you know the user's first name, you may use it once (e.g. "Thanks, Najeeb."). Keep a professional, friendly tone. Do not use "Hey", "No worries", or casual slang. Do not ask any question or introduce new topics. Output only the acknowledgment sentence, nothing else.`;

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
    const userName =
      typeof body?.userName === 'string' ? body.userName.trim().slice(0, 80) : '';

    if (!questionText) {
      return NextResponse.json({ transition: null }, { status: 200 });
    }

    if (!openai || isOpenAICircuitOpen()) {
      return NextResponse.json({ transition: null }, { status: 200 });
    }

    const userBlurb = userName
      ? `The user's first name is ${userName}. Use their name in your reply when it feels natural.`
      : '';

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: [
            userBlurb,
            `Question: ${questionText}`,
            `User's answer: ${userAnswer || '(no answer)'}`,
            '',
            'Reply with one short professional acknowledgment only. No question. No new topics.',
          ].filter(Boolean).join('\n'),
        },
      ],
max_tokens: 40,
    temperature: 0.3,
    });

    const transition = response.choices?.[0]?.message?.content?.trim();
    if (transition && transition.length > 0 && transition.length < 300) {
      recordOpenAISuccess();
      return NextResponse.json({ transition });
    }
  } catch (e) {
    recordOpenAIFailure();
    console.error('Chat transition API error:', e instanceof Error ? e.message : e);
  }

  return NextResponse.json({ transition: null }, { status: 200 });
}
