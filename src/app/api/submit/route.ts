import { NextResponse } from 'next/server';
import { validateUserResponsePayload } from '@/lib/schemas';
import { runScoringEngine } from '@/lib/scoring';
import { getOrCreateUserByEmail } from '@/lib/db/users';
import { createSession, updateSessionPdfUrl } from '@/lib/db/sessions';
import { insertResponses } from '@/lib/db/responses';
import { getNarrativeForReport } from '@/lib/narrative';
import { generateReportPdf } from '@/lib/pdf/generate-report';
import { uploadReportPdf, getReportSignedUrl } from '@/lib/storage';
import { sendThankYouEmail } from '@/lib/send-thank-you-email';
import { checkSubmitRateLimit } from '@/lib/rate-limit';
import {
  getIdempotencyKey,
  getCachedResponse,
  setCachedResponse,
} from '@/lib/idempotency';
import { toErrorMessage } from '@/lib/error-message';

export async function POST(request: Request) {
  const rateLimit = checkSubmitRateLimit(request);
  if (!rateLimit.ok) {
    return NextResponse.json(rateLimit.body, { status: rateLimit.status });
  }

  const idempotencyKey = getIdempotencyKey(request);
  if (idempotencyKey) {
    const cached = getCachedResponse(idempotencyKey);
    if (cached) {
      return NextResponse.json(cached.response, { status: cached.status });
    }
  }

  let sessionIdForRetry: string | null = null;
  try {
    const body = await request.json();
    const validated = validateUserResponsePayload(body);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    const payload = validated.data;

    const finalScore = runScoringEngine(payload);
    const traitVector = finalScore.archetype_scores;

    const user = await getOrCreateUserByEmail(payload.email);
    const session = await createSession({
      user_id: user.id,
      email: payload.email,
      trait_vector: traitVector,
      final_score: finalScore,
      pdf_url: null,
    });
    sessionIdForRetry = session.id;

    await insertResponses(
      session.id,
      payload.responses.map((r) => ({
        question_id: r.question_id,
        selected_options: r.selected_options,
        custom_text: r.custom_text ?? null,
      }))
    );

    const narrative = await getNarrativeForReport(finalScore);
    const participantName = payload.responses.find((r) => r.question_id === 1)?.custom_text?.trim() || null;
    const pdfBytes = await generateReportPdf(finalScore, narrative, { participantName });
    const pdfUrl = await uploadReportPdf(session.id, pdfBytes);
    await updateSessionPdfUrl(session.id, pdfUrl);

    const reportLinkUrl = await getReportSignedUrl(session.id);
    const emailStatus = await sendThankYouEmail(payload.email, reportLinkUrl);

    const response = { session_id: session.id, pdf_url: reportLinkUrl, email_status: emailStatus };
    if (idempotencyKey) {
      setCachedResponse(idempotencyKey, response, 200);
    }
    return NextResponse.json(response);
  } catch (err) {
    console.error('Submit error:', err);
    const message = toErrorMessage(err, 'Submit failed');
    return NextResponse.json(
      { error: message, ...(sessionIdForRetry && { session_id: sessionIdForRetry }) },
      { status: 500 }
    );
  }
}
